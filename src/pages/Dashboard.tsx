import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownRight, ArrowUpRight, Bolt, Check, Pencil, Plus, Trash2, Wallet, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEnergy } from '../data/EnergyContext'
import { calculateApplianceKwh, formatNumber, formatPeso } from '../lib/calculations'
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

function validateNumber(value: string, label: string, min: number, max?: number): string | undefined {
  if (!value.trim()) return `${label} is required.`
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return `${label} must be a valid number.`
  if (parsed < min) return `${label} must be ${min === 0 ? '0 or greater' : `at least ${min}`}.`
  if (max !== undefined && parsed > max) return `${label} must be ${max} or less.`
  return undefined
}

function validateAppliance(form: ApplianceForm): ApplianceErrors {
  const errors: ApplianceErrors = {}
  if (!form.name.trim()) errors.name = 'Appliance name is required.'
  errors.wattage = validateNumber(form.wattage, 'Wattage', 0.01)
  errors.quantity = validateNumber(form.quantity, 'Quantity', 1)
  if (form.quantity && !Number.isInteger(Number(form.quantity))) errors.quantity = 'Quantity must be a whole number.'
  errors.hoursPerDay = validateNumber(form.hoursPerDay, 'Hours per day', 0, 24)
  errors.daysPerMonth = validateNumber(form.daysPerMonth, 'Days per month', 0, 31)
  if (form.daysPerMonth && !Number.isInteger(Number(form.daysPerMonth))) errors.daysPerMonth = 'Days per month must be a whole number.'
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value)) as ApplianceErrors
}

function asApplianceInput(form: ApplianceForm): ApplianceInput {
  return {
    name: form.name.trim(),
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
  const { household, appliances, loading, saveHousehold, saveAppliance, deleteAppliance } = useEnergy()
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

  async function handleBillSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = {
      monthlyConsumption: validateNumber(billForm.monthlyConsumption, 'Monthly consumption', 0),
      billAmount: validateNumber(billForm.billAmount, 'Bill amount', 0),
      rate: validateNumber(billForm.rate, 'Rate', 0.01),
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
        title="Energy dashboard"
        description="Record your actual billed information separately from appliance-based estimates."
        action={
          <Link to="/optimization" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:w-auto">
            Explore projections <ArrowUpRight size={16} />
          </Link>
        }
      />

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        <strong>Illustrative estimates.</strong> Appliance costs are based on the entered usage schedule and rate; they are not actual utility charges.
      </div>

      {formError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>}

      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Estimated consumption" value={`${formatNumber(estimatedKwh)} kWh`} detail="Appliance schedule · monthly" icon={Zap} />
        <SummaryCard label="Estimated appliance cost" value={formatPeso(estimatedCost)} detail={`At ₱${formatNumber(household?.rate ?? 12, 2)} per kWh`} icon={Wallet} tone="amber" />
        <SummaryCard label="Actual billed consumption" value={household ? `${formatNumber(household.monthlyConsumption)} kWh` : '—'} detail="From your utility bill" icon={Bolt} tone="teal" />
        <SummaryCard label="Highest energy use" value={highest ? highest.name : '—'} detail={highest ? `${formatNumber(calculateApplianceKwh(highest))} kWh estimated` : 'Add an appliance to compare'} icon={ArrowDownRight} tone="violet" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="Actual billed info" description="Transcribe your monthly utility bill; these are not appliance estimates.">
          <form onSubmit={handleBillSubmit} noValidate className="space-y-4">
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
          title="Appliance manager"
          description="Estimated costs use monthly appliance energy × the entered rate."
          action={<span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">{appliances.length} {appliances.length === 1 ? 'item' : 'items'}</span>}
        >
          {!household && (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
              Save actual billed info first to create a household record and enable appliance saving.
            </div>
          )}
          <form onSubmit={handleApplianceSubmit} noValidate className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="mb-3 text-xs font-bold text-blue-800">{editingId ? 'Edit appliance' : 'Add an appliance'}</p>
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
              <Field id="appliance-name" label="Appliance name" placeholder="e.g. Electric fan" value={applianceForm.name} error={applianceErrors.name} onChange={(event) => setApplianceForm({ ...applianceForm, name: event.target.value })} />
              <Field id="appliance-wattage" label="Wattage (W)" type="number" min="0.01" step="0.01" placeholder="e.g. 60" value={applianceForm.wattage} error={applianceErrors.wattage} onChange={(event) => setApplianceForm({ ...applianceForm, wattage: event.target.value })} />
              <Field id="appliance-quantity" label="Quantity" type="number" min="1" step="1" value={applianceForm.quantity} error={applianceErrors.quantity} onChange={(event) => setApplianceForm({ ...applianceForm, quantity: event.target.value })} />
              <Field id="appliance-hours" label="Hours per day" type="number" min="0" max="24" step="0.25" placeholder="e.g. 8" value={applianceForm.hoursPerDay} error={applianceErrors.hoursPerDay} onChange={(event) => setApplianceForm({ ...applianceForm, hoursPerDay: event.target.value })} />
              <Field id="appliance-days" label="Days per month" type="number" min="0" max="31" step="1" value={applianceForm.daysPerMonth} error={applianceErrors.daysPerMonth} onChange={(event) => setApplianceForm({ ...applianceForm, daysPerMonth: event.target.value })} />
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {editingId && <button type="button" onClick={cancelEdit} className="rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Cancel</button>}
              <button type="submit" disabled={!household || applianceSaving} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus size={15} /> {applianceSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add appliance'}
              </button>
            </div>
          </form>

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
