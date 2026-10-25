import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownRight, ArrowUpRight, Bolt, Check, Pencil, Plus, Search, Trash2, Wallet, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEnergy } from '../data/EnergyContext'
import { calculateApplianceKwh, formatNumber, formatPeso } from '../lib/calculations'
import { MAX_DATABASE_NUMERIC, MAX_POSTGRES_INTEGER, numericInputError, sanitizePlainText } from '../lib/inputValidation'
import type { Appliance, ApplianceInput } from '../types'
import { EmptyState, Field, LoadingState, PageHeading, SectionCard } from '../components/Ui'

type HouseholdForm = { monthlyConsumption: string; billAmount: string; rate: string }
type ApplianceForm = {
  name: string
  wattage: string
  quantity: string
  hoursPerDay: string
  daysPerMonth: string
}
type ApplianceErrors = Partial<Record<keyof ApplianceForm, string>>

const blankAppliance: ApplianceForm = {
  name: '',
  wattage: '',
  quantity: '1',
  hoursPerDay: '',
  daysPerMonth: '30',
}

const appliancePresets: Array<{ name: string; wattage: number; hoursPerDay: number }> = [
  { name: 'LED bulb', wattage: 10, hoursPerDay: 6 },
  { name: 'Electric fan', wattage: 60, hoursPerDay: 8 },
  { name: 'Television', wattage: 100, hoursPerDay: 5 },
  { name: 'Refrigerator', wattage: 150, hoursPerDay: 24 },
  { name: 'Rice cooker', wattage: 700, hoursPerDay: 1 },
  { name: 'Air conditioner', wattage: 1000, hoursPerDay: 8 },
]

const applianceLibrary: Array<{ name: string; category: string; wattage: number; hoursPerDay: number; daysPerMonth: number }> = [
  { name: 'LED bulb', category: 'Lighting', wattage: 10, hoursPerDay: 6, daysPerMonth: 30 },
  { name: 'Fluorescent light', category: 'Lighting', wattage: 40, hoursPerDay: 6, daysPerMonth: 30 },
  { name: 'Ceiling fan', category: 'Cooling', wattage: 75, hoursPerDay: 8, daysPerMonth: 30 },
  { name: 'Stand fan', category: 'Cooling', wattage: 60, hoursPerDay: 8, daysPerMonth: 30 },
  { name: 'Window air conditioner (1 HP)', category: 'Cooling', wattage: 746, hoursPerDay: 8, daysPerMonth: 30 },
  { name: 'Window air conditioner (1.5 HP)', category: 'Cooling', wattage: 1119, hoursPerDay: 8, daysPerMonth: 30 },
  { name: 'Refrigerator', category: 'Kitchen', wattage: 150, hoursPerDay: 8, daysPerMonth: 30 },
  { name: 'Rice cooker', category: 'Kitchen', wattage: 700, hoursPerDay: 1, daysPerMonth: 30 },
  { name: 'Electric kettle', category: 'Kitchen', wattage: 1500, hoursPerDay: 0.3, daysPerMonth: 30 },
  { name: 'Microwave oven', category: 'Kitchen', wattage: 1200, hoursPerDay: 0.3, daysPerMonth: 20 },
  { name: 'Induction cooker', category: 'Kitchen', wattage: 1800, hoursPerDay: 1, daysPerMonth: 30 },
  { name: 'Water dispenser', category: 'Kitchen', wattage: 500, hoursPerDay: 4, daysPerMonth: 30 },
  { name: 'Television', category: 'Electronics', wattage: 100, hoursPerDay: 5, daysPerMonth: 30 },
  { name: 'Laptop', category: 'Electronics', wattage: 65, hoursPerDay: 6, daysPerMonth: 25 },
  { name: 'Desktop computer', category: 'Electronics', wattage: 200, hoursPerDay: 6, daysPerMonth: 25 },
  { name: 'Wi-Fi router', category: 'Electronics', wattage: 12, hoursPerDay: 24, daysPerMonth: 30 },
  { name: 'Phone charger', category: 'Electronics', wattage: 10, hoursPerDay: 3, daysPerMonth: 30 },
  { name: 'Washing machine', category: 'Laundry', wattage: 500, hoursPerDay: 1, daysPerMonth: 12 },
  { name: 'Clothes iron', category: 'Laundry', wattage: 1000, hoursPerDay: 0.5, daysPerMonth: 12 },
  { name: 'Water pump', category: 'Other', wattage: 750, hoursPerDay: 1, daysPerMonth: 30 },
  { name: 'Vacuum cleaner', category: 'Other', wattage: 1000, hoursPerDay: 0.3, daysPerMonth: 8 },
  { name: 'Hair dryer', category: 'Personal care', wattage: 1200, hoursPerDay: 0.2, daysPerMonth: 20 },
]

function validateAppliance(form: ApplianceForm): ApplianceErrors {
  const errors: ApplianceErrors = {}
  const name = sanitizePlainText(form.name, 121)
  if (!name) errors.name = 'Appliance name is required.'
  else if (name.length > 120) errors.name = 'Appliance name must be 120 characters or less.'
  errors.wattage = numericInputError(form.wattage, 'Wattage', 0.01, MAX_DATABASE_NUMERIC)
  errors.quantity = numericInputError(form.quantity, 'Quantity', 1, MAX_POSTGRES_INTEGER, true)
  errors.hoursPerDay = numericInputError(form.hoursPerDay, 'Hours per day', 0, 24)
  errors.daysPerMonth = numericInputError(form.daysPerMonth, 'Days per month', 0, 31, true)
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value)) as ApplianceErrors
}

function asApplianceInput(form: ApplianceForm): ApplianceInput {
  return {
    name: sanitizePlainText(form.name, 120),
    wattage: Number(form.wattage),
    quantity: Number(form.quantity),
    hoursPerDay: Number(form.hoursPerDay),
    daysPerMonth: Number(form.daysPerMonth),
  }
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'blue',
}: {
  label: string
  value: string
  detail: string
  icon: typeof Zap
  tone?: 'blue' | 'amber' | 'teal' | 'violet'
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    teal: 'bg-teal-50 text-teal-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-blue-500">{label}</p>
        <span className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}><Icon size={18} /></span>
      </div>
      <p className="mt-4 break-words text-xl font-bold leading-tight tracking-tight text-blue-950 sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-blue-400">{detail}</p>
    </div>
  )
}

export function Dashboard() {
  const { user, household, appliances, loading, saveHousehold, saveAppliance, deleteAppliance } = useEnergy()
  const [billForm, setBillForm] = useState<HouseholdForm>({
    monthlyConsumption: '',
    billAmount: '',
    rate: '12',
  })
  const [billErrors, setBillErrors] = useState<Partial<Record<keyof HouseholdForm, string>>>({})
  const [billSaving, setBillSaving] = useState(false)
  const [billSaved, setBillSaved] = useState(false)
  const [applianceForm, setApplianceForm] = useState<ApplianceForm>(blankAppliance)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [applianceErrors, setApplianceErrors] = useState<ApplianceErrors>({})
  const [applianceSaving, setApplianceSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedPreset, setSelectedPreset] = useState('')
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryQuantities, setLibraryQuantities] = useState<Record<string, string>>({})
  const [librarySaving, setLibrarySaving] = useState(false)
  const [libraryResult, setLibraryResult] = useState<string | null>(null)
  const [libraryError, setLibraryError] = useState<string | null>(null)

  const filteredLibrary = applianceLibrary.filter((item) =>
    `${item.name} ${item.category}`.toLowerCase().includes(librarySearch.trim().toLowerCase()),
  )
  const selectedLibraryItems = applianceLibrary.filter((item) => libraryQuantities[item.name] !== undefined)

  useEffect(() => {
    if (household) {
      setBillForm({
        monthlyConsumption: String(household.monthlyConsumption),
        billAmount: String(household.billAmount),
        rate: String(household.rate),
      })
    }
  }, [household])

  const estimatedKwh = useMemo(
    () => appliances.reduce((total, item) => total + calculateApplianceKwh(item), 0),
    [appliances],
  )
  const estimatedCost = estimatedKwh * (household?.rate ?? 12)
  const highest = appliances.reduce<Appliance | null>(
    (current, item) => !current || calculateApplianceKwh(item) > calculateApplianceKwh(current) ? item : current,
    null,
  )
  const setupStep = !household ? 1 : appliances.length === 0 ? 2 : 3
  const nextSetupHref = setupStep === 1 ? '#actual-bill' : setupStep === 2 ? '#appliance-library' : '/optimization'
  const nextSetupLabel = setupStep === 1 ? 'Add your bill details' : setupStep === 2 ? 'Choose your appliances' : 'Explore an energy plan'
  const setupSteps = [
    { number: '01', label: 'Your bill', done: Boolean(household) },
    { number: '02', label: 'Your appliances', done: appliances.length > 0 },
    { number: '03', label: 'Your plan', done: false },
  ]
  const displayName = typeof user?.user_metadata?.display_name === 'string'
    ? sanitizePlainText(user.user_metadata.display_name, 80)
    : ''

  async function handleBillSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = {
      monthlyConsumption: numericInputError(billForm.monthlyConsumption, 'Monthly consumption', 0, MAX_DATABASE_NUMERIC),
      billAmount: numericInputError(billForm.billAmount, 'Bill amount', 0, MAX_DATABASE_NUMERIC),
      rate: numericInputError(billForm.rate, 'Rate', 0.01, MAX_DATABASE_NUMERIC),
    }
    setBillErrors(Object.fromEntries(Object.entries(errors).filter(([, value]) => value)) as typeof errors)
    if (Object.values(errors).some(Boolean)) return
    setBillSaving(true)
    setFormError(null)
    setBillSaved(false)
    try {
      await saveHousehold({
        monthlyConsumption: Number(billForm.monthlyConsumption),
        billAmount: Number(billForm.billAmount),
        rate: Number(billForm.rate),
      })
      setBillSaved(true)
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save billed information.')
    } finally {
      setBillSaving(false)
    }
  }

  function beginEdit(appliance: Appliance) {
    setEditingId(appliance.id)
    setApplianceForm({
      name: appliance.name,
      wattage: String(appliance.wattage),
      quantity: String(appliance.quantity),
      hoursPerDay: String(appliance.hoursPerDay),
      daysPerMonth: String(appliance.daysPerMonth),
    })
    setApplianceErrors({})
    setFormError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setApplianceForm(blankAppliance)
    setApplianceErrors({})
  }

  async function handleApplianceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateAppliance(applianceForm)
    setApplianceErrors(errors)
    if (Object.keys(errors).length > 0) return
    setApplianceSaving(true)
    setFormError(null)
    try {
      await saveAppliance(asApplianceInput(applianceForm), editingId ?? undefined)
      cancelEdit()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save the appliance.')
    } finally {
      setApplianceSaving(false)
    }
  }

  async function addLibraryAppliances() {
    if (!household || selectedLibraryItems.length === 0) return
    setLibrarySaving(true)
    setLibraryResult(null)
    setLibraryError(null)
    setFormError(null)
    const failed: string[] = []
    let added = 0

    for (const item of selectedLibraryItems) {
      const quantity = Number(libraryQuantities[item.name])
      const quantityError = numericInputError(quantity, `${item.name} quantity`, 1, MAX_POSTGRES_INTEGER, true)
      if (quantityError) {
        failed.push(`${quantityError}`)
        continue
      }
      try {
        await saveAppliance({
          name: item.name,
          wattage: item.wattage,
          quantity,
          hoursPerDay: item.hoursPerDay,
          daysPerMonth: item.daysPerMonth,
        })
        added += 1
        setLibraryQuantities((current) => {
          const next = { ...current }
          delete next[item.name]
          return next
        })
      } catch (cause) {
        failed.push(`${item.name}: ${cause instanceof Error ? cause.message : 'could not save.'}`)
      }
    }

    if (added > 0) setLibraryResult(`Added ${added} ${added === 1 ? 'appliance' : 'appliances'}. You can edit their details below.`)
    if (failed.length > 0) setLibraryError(`Some items were not added: ${failed.join(' ')}`)
    setLibrarySaving(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this appliance and its saved usage details?')) return
    setFormError(null)
    try {
      await deleteAppliance(id)
      if (editingId === id) cancelEdit()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not delete the appliance.')
    }
  }

  if (loading) return <LoadingState />

  return (
    <>
      <PageHeading
        eyebrow="Household overview"
        title={displayName ? `Welcome, ${displayName}.` : 'Your home, at a glance.'}
        description="A practical picture of where your household electricity goes."
      />

      <section className="energy-hero mb-6 overflow-hidden rounded-[1.75rem] bg-blue-950 p-5 text-white sm:p-7 lg:p-8">
        <div className="grid items-end gap-7 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="relative z-10">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-300" />
              Your energy, made visible
            </p>
            <h2 className="mt-4 max-w-xl font-serif text-3xl leading-tight tracking-tight text-white sm:text-4xl">
              Small details.<br /><span className="text-amber-300">Smarter choices.</span>
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-blue-100">
              {setupStep === 1
                ? 'Start with the numbers on your latest bill. Then add household appliances to see how your daily routines shape energy use.'
                : setupStep === 2
                  ? 'Your bill is recorded. Add the appliances you use most to build a useful monthly estimate.'
                  : 'Your household profile is taking shape. Explore a schedule change and see its estimated impact before you make it.'}
            </p>
            <div className="mt-6 grid max-w-lg grid-cols-3 gap-2">
              {setupSteps.map((step, index) => (
                <div key={step.number} className="min-w-0">
                  <div className={`mb-2 h-1 rounded-full ${step.done || setupStep === index + 1 ? 'bg-amber-300' : 'bg-white/20'}`} />
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${step.done || setupStep === index + 1 ? 'text-white' : 'text-blue-300'}`}>
                    {step.done ? '✓ ' : `${step.number} `}{step.label}
                  </p>
                </div>
              ))}
            </div>
            {setupStep === 3 ? (
              <Link to={nextSetupHref} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-blue-950 transition hover:bg-amber-200">
                {nextSetupLabel} <ArrowUpRight size={16} />
              </Link>
            ) : (
              <a href={nextSetupHref} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-blue-950 transition hover:bg-amber-200">
                {nextSetupLabel} <ArrowUpRight size={16} />
              </a>
            )}
          </div>
          <div className="energy-orbit relative min-h-44 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-5">
            <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full border border-amber-300/15" />
            <div className="pointer-events-none absolute -right-5 -top-9 size-40 rounded-full border border-amber-300/20" />
            <div className="pointer-events-none absolute right-8 top-7 size-2 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.8)]" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">A good place to begin</p>
              <p className="mt-3 max-w-xs font-serif text-2xl leading-tight text-white">
                {setupStep === 1 ? 'One bill. One useful baseline.' : setupStep === 2 ? 'Build your home’s energy profile.' : `${appliances.length} ${appliances.length === 1 ? 'appliance' : 'appliances'} in your energy profile.`}
              </p>
              <p className="mt-3 max-w-sm text-xs leading-5 text-blue-200">
                Your billed electricity and appliance estimates stay separate, so you can compare without confusing a projection for a bill.
              </p>
            </div>
            <div className="relative mt-5 flex items-center gap-2 text-[10px] font-semibold text-blue-200">
              <span className="inline-block size-2 rounded-sm bg-amber-300" /> Actual billed info
              <span className="ml-2 inline-block size-2 rounded-sm bg-blue-400" /> Appliance estimate
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6 flex items-start gap-3 border-l-2 border-amber-400 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-950">
        <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-400" />
        <p><strong>Illustrative estimates.</strong> Appliance costs use your entered schedule and rate; they are not actual utility charges.</p>
      </div>

      {formError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>}

      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Estimated consumption" value={`${formatNumber(estimatedKwh)} kWh`} detail="Appliance schedule · monthly" icon={Zap} />
        <SummaryCard label="Estimated appliance cost" value={formatPeso(estimatedCost)} detail={`At ₱${formatNumber(household?.rate ?? 12, 2)} per kWh`} icon={Wallet} tone="amber" />
        <SummaryCard label="Actual billed consumption" value={household ? `${formatNumber(household.monthlyConsumption)} kWh` : '—'} detail="From your utility bill" icon={Bolt} tone="teal" />
        <SummaryCard label="Highest energy use" value={highest ? highest.name : '—'} detail={highest ? `${formatNumber(calculateApplianceKwh(highest))} kWh estimated` : 'Add an appliance to compare'} icon={ArrowDownRight} tone="violet" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="The bill" description="Enter the figures from your latest utility bill. These are your actual billed values." className="scroll-mt-6" >
          <form id="actual-bill" onSubmit={handleBillSubmit} noValidate className="scroll-mt-6 space-y-4">
            <Field
              id="monthly-consumption"
              label="Monthly consumption (kWh)"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 250"
              value={billForm.monthlyConsumption}
              error={billErrors.monthlyConsumption}
              onChange={(event) => setBillForm({ ...billForm, monthlyConsumption: event.target.value })}
            />
            <Field
              id="bill-amount"
              label="Bill amount (₱)"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 3,000"
              value={billForm.billAmount}
              error={billErrors.billAmount}
              onChange={(event) => setBillForm({ ...billForm, billAmount: event.target.value })}
            />
            <Field
              id="electricity-rate"
              label="Rate (₱/kWh)"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={billForm.rate}
              error={billErrors.rate}
              hint="Default rate: ₱12/kWh. Adjust to match your bill."
              onChange={(event) => setBillForm({ ...billForm, rate: event.target.value })}
            />
            <div className="flex items-center justify-between gap-3 pt-1">
              <span aria-live="polite" className="text-xs text-emerald-700">
                {billSaved && <span className="inline-flex items-center gap-1"><Check size={14} /> Saved</span>}
              </span>
              <button type="submit" disabled={billSaving} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">
                {billSaving ? 'Saving…' : 'Save billed info'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="The appliances"
          description="Pick the common items in your home. You can adjust every estimate later."
          action={<span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">{appliances.length} {appliances.length === 1 ? 'item' : 'items'}</span>}
          className="scroll-mt-6"
        >
          {!household && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              <p>Save your bill details first. The household record is required before appliances can be attached and saved.</p>
              <a href="#actual-bill" className="shrink-0 font-bold text-blue-800 underline underline-offset-2 hover:text-blue-950">
                Go to bill form
              </a>
            </div>
          )}
          <div id="appliance-library" className="mb-5 scroll-mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-blue-900">Quick add from the appliance library</h3>
                <p className="mt-1 text-xs leading-5 text-blue-600">Choose common items and quantities. Values are illustrative starting points—check your appliance label and actual use.</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-600">{selectedLibraryItems.length} selected</span>
            </div>
            <label className="mb-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
              <Search size={16} className="shrink-0 text-blue-400" />
              <input
                type="search"
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="Search appliances or category"
                aria-label="Search appliance library"
                className="min-w-0 flex-1 bg-transparent text-sm text-blue-950 outline-none placeholder:text-blue-300"
              />
            </label>
            <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
              {filteredLibrary.map((item) => {
                const selected = libraryQuantities[item.name] !== undefined
                const alreadyAdded = appliances.some((appliance) => appliance.name.toLowerCase() === item.name.toLowerCase())
                return (
                  <div key={item.name} className={`flex min-w-0 items-center gap-2 rounded-xl border border-blue-100 bg-white p-2.5 ${alreadyAdded ? 'opacity-60' : ''}`}>
                    <input
                      id={`library-${item.name}`}
                      type="checkbox"
                      checked={selected}
                      disabled={alreadyAdded || librarySaving}
                      onChange={(event) => {
                        setLibraryQuantities((current) => {
                          if (!event.target.checked) {
                            const next = { ...current }
                            delete next[item.name]
                            return next
                          }
                          return { ...current, [item.name]: '1' }
                        })
                        setLibraryError(null)
                      }}
                      className="size-4 shrink-0 accent-blue-700"
                    />
                    <label htmlFor={`library-${item.name}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block truncate text-xs font-semibold text-blue-900">{item.name}</span>
                      <span className="block text-[11px] text-blue-500">{alreadyAdded ? 'Already in your list · use Edit to update' : `${item.category} · ${item.wattage} W · ${formatNumber(item.hoursPerDay)} h/day`}</span>
                    </label>
                    {selected && (
                      <label className="flex shrink-0 items-center gap-1 text-[11px] text-blue-600">
                        Qty
                        <input
                          type="number"
                          min="1"
                          step="1"
                          disabled={librarySaving}
                          value={libraryQuantities[item.name]}
                          onChange={(event) => setLibraryQuantities((current) => ({ ...current, [item.name]: event.target.value }))}
                          aria-label={`${item.name} quantity`}
                          className="w-14 rounded-lg border border-blue-200 px-1.5 py-1 text-center text-xs text-blue-950 outline-none focus:border-blue-500"
                        />
                      </label>
                    )}
                  </div>
                )
              })}
              {filteredLibrary.length === 0 && <p className="rounded-xl border border-dashed border-blue-200 p-4 text-center text-xs text-blue-500 sm:col-span-2">No appliances match that search.</p>}
            </div>
            {(libraryResult || libraryError) && (
              <div className="mt-3 space-y-1" aria-live="polite">
                {libraryResult && <p role="status" className="text-xs font-semibold text-emerald-700">{libraryResult}</p>}
                {libraryError && <p role="alert" className="text-xs text-rose-700">{libraryError}</p>}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] leading-5 text-blue-500">Usage hours are starting estimates and can be adjusted after adding.</p>
              <button
                type="button"
                onClick={() => void addLibraryAppliances()}
                disabled={!household || selectedLibraryItems.length === 0 || librarySaving}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Plus size={15} /> {librarySaving ? 'Adding appliances…' : !household ? 'Save bill first to add' : `Add ${selectedLibraryItems.length} selected`}
              </button>
            </div>
          </div>

          <details open={Boolean(editingId)} className="mb-5 rounded-xl border border-blue-100 bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-blue-800">
              {editingId ? 'Edit appliance details' : 'Add a custom appliance instead'}
            </summary>
            <form onSubmit={handleApplianceSubmit} noValidate className="border-t border-blue-100 bg-blue-50/60 p-4">
              {!editingId && (
                <label htmlFor="appliance-preset" className="mb-3 block">
                  <span className="mb-1.5 block text-xs font-semibold text-blue-800">Quick start with a typical appliance</span>
                  <select
                    id="appliance-preset"
                    value={selectedPreset}
                    onChange={(event) => {
                      const preset = appliancePresets.find((item) => item.name === event.target.value)
                      setSelectedPreset(event.target.value)
                      if (preset) {
                        setApplianceForm({
                          ...blankAppliance,
                          name: preset.name,
                          wattage: String(preset.wattage),
                          hoursPerDay: String(preset.hoursPerDay),
                        })
                        setApplianceErrors({})
                      }
                    }}
                    className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-sm text-blue-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Choose a preset to prefill values…</option>
                    {appliancePresets.map((preset) => (
                      <option key={preset.name} value={preset.name}>{preset.name} · {preset.wattage} W · {preset.hoursPerDay} h/day</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs leading-5 text-blue-500">Presets are illustrative starting points. Check the appliance label and change the wattage and usage to match your home.</span>
                </label>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="appliance-name" label="Appliance name" maxLength={120} placeholder="e.g. Electric fan" value={applianceForm.name} error={applianceErrors.name} onChange={(event) => setApplianceForm({ ...applianceForm, name: event.target.value })} />
                <Field id="appliance-wattage" label="Wattage (W)" type="number" min="0.01" step="0.01" placeholder="e.g. 60" value={applianceForm.wattage} error={applianceErrors.wattage} onChange={(event) => setApplianceForm({ ...applianceForm, wattage: event.target.value })} />
                <Field id="appliance-quantity" label="Quantity" type="number" min="1" step="1" value={applianceForm.quantity} error={applianceErrors.quantity} onChange={(event) => setApplianceForm({ ...applianceForm, quantity: event.target.value })} />
                <Field id="appliance-hours" label="Hours per day" type="number" min="0" max="24" step="0.25" placeholder="e.g. 8" value={applianceForm.hoursPerDay} error={applianceErrors.hoursPerDay} onChange={(event) => setApplianceForm({ ...applianceForm, hoursPerDay: event.target.value })} />
                <Field id="appliance-days" label="Days per month" type="number" min="0" max="31" step="1" value={applianceForm.daysPerMonth} error={applianceErrors.daysPerMonth} onChange={(event) => setApplianceForm({ ...applianceForm, daysPerMonth: event.target.value })} />
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {editingId && <button type="button" onClick={cancelEdit} className="rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Cancel</button>}
                <button type="submit" disabled={!household || applianceSaving} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                  <Plus size={15} /> {applianceSaving ? 'Saving…' : editingId ? 'Save changes' : !household ? 'Save bill first' : 'Add custom appliance'}
                </button>
              </div>
            </form>
          </details>

          {appliances.length === 0 ? (
            <EmptyState>No appliances saved yet. Add an appliance above to estimate its monthly energy use.</EmptyState>
          ) : (
            <div className="divide-y divide-blue-50">
              {appliances.map((appliance) => (
                <div key={appliance.id} className="flex flex-col gap-3 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-blue-950">{appliance.name}</p>
                    <p className="mt-1 text-xs text-blue-400">{formatNumber(appliance.wattage, 0)} W · {appliance.quantity} unit{appliance.quantity === 1 ? '' : 's'} · {formatNumber(appliance.hoursPerDay)} h/day · {appliance.daysPerMonth} days/mo</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="whitespace-nowrap text-sm font-bold text-blue-800">{formatNumber(calculateApplianceKwh(appliance))} kWh <span className="font-normal text-blue-400">/ {formatPeso(calculateApplianceKwh(appliance) * (household?.rate ?? 12))}</span></span>
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Edit ${appliance.name}`} onClick={() => beginEdit(appliance)} className="rounded-lg p-2 text-blue-500 hover:bg-blue-50 hover:text-blue-800"><Pencil size={15} /></button>
                      <button type="button" aria-label={`Delete ${appliance.name}`} onClick={() => void handleDelete(appliance.id)} className="rounded-lg p-2 text-blue-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  )
}
