import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowRight, Check, Pencil, RotateCcw, Save, Search, SlidersHorizontal, Sparkles, TrendingDown, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, Field, LoadingState, PageHeading, SectionCard } from '../components/Ui'
import { useEnergy } from '../data/EnergyContext'
import { calculateMonthlyKwh, formatNumber, formatPeso, rankAppliances } from '../lib/calculations'
import type { Appliance, ApplianceInput } from '../types'

type ApplianceEditForm = {
  name: string
  wattage: string
  quantity: string
  hoursPerDay: string
  daysPerMonth: string
}

function editFormFor(appliance: Appliance): ApplianceEditForm {
  return {
    name: appliance.name,
    wattage: String(appliance.wattage),
    quantity: String(appliance.quantity),
    hoursPerDay: String(appliance.hoursPerDay),
    daysPerMonth: String(appliance.daysPerMonth),
  }
}

function validateEditForm(form: ApplianceEditForm): string | null {
  if (!form.name.trim()) return 'Enter an appliance name.'
  const wattage = Number(form.wattage)
  const quantity = Number(form.quantity)
  const hours = Number(form.hoursPerDay)
  const days = Number(form.daysPerMonth)
  if (!Number.isFinite(wattage) || wattage <= 0) return 'Wattage must be greater than 0.'
  if (!Number.isInteger(quantity) || quantity < 1) return 'Quantity must be a whole number of at least 1.'
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) return 'Hours per day must be between 0 and 24.'
  if (!Number.isInteger(days) || days < 0 || days > 31) return 'Days per month must be a whole number from 0 to 31.'
  return null
}

export function Optimization() {
  const { household, appliances, loading, proposedHours, setProposedHours, resetProposedHours, saveAppliance } = useEnergy()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ApplianceEditForm | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [applianceSearch, setApplianceSearch] = useState('')
  const ranked = useMemo(() => rankAppliances(appliances), [appliances])
  const rate = household?.rate ?? 12
  const projected = useMemo(
    () => ranked.map((appliance) => {
      const hours = proposedHours[appliance.id] ?? appliance.hoursPerDay
      return {
        ...appliance,
        proposedHours: hours,
        projectedKwh: calculateMonthlyKwh(appliance.wattage, appliance.quantity, hours, appliance.daysPerMonth),
      }
    }),
    [ranked, proposedHours],
  )
  const visibleProjected = useMemo(
    () => projected.filter((item) => item.name.toLowerCase().includes(applianceSearch.trim().toLowerCase())),
    [projected, applianceSearch],
  )
  const originalKwh = ranked.reduce((sum, appliance) => sum + appliance.originalKwh, 0)
  const projectedKwh = projected.reduce((sum, appliance) => sum + appliance.projectedKwh, 0)
  const savedKwh = originalKwh - projectedKwh
  const recommendations = ranked.filter((appliance) => appliance.originalKwh > 0).slice(0, 3)
  const topUse = ranked[0]
  const topShare = topUse && originalKwh > 0 ? topUse.originalKwh / originalKwh * 100 : 0
  const billedDifference = household ? originalKwh - household.monthlyConsumption : null

  if (loading) return <LoadingState />

  return (
    <>
      <PageHeading
        eyebrow="Usage scenario"
        title="Energy optimization"
        description="Adjust proposed daily operating hours to compare original usage with a transparent projection."
        action={
          <button
            type="button"
            onClick={resetProposedHours}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 sm:w-auto"
          >
            <RotateCcw size={15} /> Reset scenario
          </button>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 text-xs leading-5 text-blue-600">
        <SlidersHorizontal size={16} className="mt-0.5 shrink-0 text-blue-500" />
        <p>Adjust the plan to preview energy and cost changes. Use <strong className="text-blue-900">Save proposed hours</strong> on an appliance to make that new schedule your saved usage.</p>
      </div>
      {actionError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</div>}

      {ranked.length === 0 ? (
        <SectionCard title="Appliance ranking" description="Add appliances in the dashboard to start comparing.">
          <EmptyState>No saved appliance data yet. <Link to="/" className="font-semibold text-blue-700 underline underline-offset-2">Go to Dashboard</Link> to add appliances.</EmptyState>
        </SectionCard>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-blue-100 bg-white p-5">
              <p className="text-xs font-semibold text-blue-500">Original estimated use</p>
              <p className="mt-2 text-2xl font-bold text-blue-950">{formatNumber(originalKwh)} <span className="text-sm font-semibold text-blue-400">kWh/mo</span></p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-5">
              <p className="text-xs font-semibold text-blue-500">Projected use</p>
              <p className="mt-2 text-2xl font-bold text-blue-950">{formatNumber(projectedKwh)} <span className="text-sm font-semibold text-blue-400">kWh/mo</span></p>
              <p className="mt-1 text-xs text-blue-400">Estimated cost: {formatPeso(projectedKwh * rate)}</p>
            </div>
            <div className={`rounded-2xl border p-5 ${savedKwh >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-xs font-semibold ${savedKwh >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{savedKwh >= 0 ? 'Projected savings' : 'Projected increase'}</p>
              <p className={`mt-2 text-2xl font-bold ${savedKwh >= 0 ? 'text-emerald-900' : 'text-amber-900'}`}>{formatNumber(Math.abs(savedKwh))} <span className={`text-sm font-semibold ${savedKwh >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>kWh/mo</span></p>
              <p className={`mt-1 text-xs ${savedKwh >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{formatPeso(Math.abs(savedKwh * rate))} estimated {savedKwh >= 0 ? 'savings' : 'added cost'}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-5">
              <p className="text-xs font-semibold text-blue-500">Largest appliance share</p>
              <p className="mt-2 truncate text-xl font-bold text-blue-950">{topUse?.name ?? '—'}</p>
              <p className="mt-1 text-xs text-blue-400">{formatNumber(topShare)}% of listed appliance use</p>
            </div>
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard title="Usage plan" description={`Showing ${visibleProjected.length} of ${projected.length}, ranked by monthly energy use.`}>
              <label className="mb-4 flex w-full max-w-md items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                <Search size={16} className="shrink-0 text-blue-400" />
                <input
                  type="search"
                  value={applianceSearch}
                  onChange={(event) => setApplianceSearch(event.target.value)}
                  placeholder="Find an appliance"
                  aria-label="Filter usage plan appliances"
                  className="min-w-0 flex-1 bg-transparent text-sm text-blue-950 outline-none placeholder:text-blue-300"
                />
              </label>
              {visibleProjected.length === 0 ? (
                <EmptyState>No appliances match “{applianceSearch}”. Try another search.</EmptyState>
              ) : (
              <div className="space-y-5">
                {visibleProjected.map((appliance) => {
                  const index = ranked.findIndex((item) => item.id === appliance.id)
                  const changed = appliance.proposedHours !== appliance.hoursPerDay
                  return (
                    <div key={appliance.id} className="rounded-xl border border-blue-100 p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-bold text-blue-950">{appliance.name}</p>
                            <p className="text-xs text-blue-500">Original: {formatNumber(appliance.originalKwh)} kWh/mo</p>
                          </div>
                          <p className="mt-1 text-xs text-blue-400">{formatNumber(appliance.wattage, 0)} W × {appliance.quantity} · {appliance.daysPerMonth} days/month</p>
                        </div>
                      </div>
                      <label htmlFor={`hours-${appliance.id}`} className="flex items-center justify-between gap-2 text-xs font-semibold text-blue-700">
                        <span>Proposed hours per day</span>
                        <span className="font-bold text-blue-900">{formatNumber(appliance.proposedHours, 2)} h</span>
                      </label>
                      <input
                        id={`hours-${appliance.id}`}
                        type="range"
                        min="0"
                        max="24"
                        step="0.25"
                        value={appliance.proposedHours}
                        onChange={(event) => setProposedHours((current) => ({
                          ...current,
                          [appliance.id]: Number(event.target.value),
                        }))}
                        className="mt-2 w-full accent-blue-700"
                        aria-label={`Proposed hours per day for ${appliance.name}`}
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <label htmlFor={`hours-input-${appliance.id}`} className="flex items-center gap-2 text-xs text-blue-500">
                          Or enter hours
                          <input
                            id={`hours-input-${appliance.id}`}
                            type="number"
                            min="0"
                            max="24"
                            step="0.25"
                            value={appliance.proposedHours}
                            onChange={(event) => {
                              const value = event.currentTarget.valueAsNumber
                              if (Number.isFinite(value) && value >= 0 && value <= 24) {
                                setProposedHours((current) => ({ ...current, [appliance.id]: value }))
                              }
                            }}
                            className="w-20 rounded-lg border border-blue-200 px-2 py-1 text-xs text-blue-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </label>
                        <span className="text-xs text-blue-500">Projected: <strong className="text-blue-800">{formatNumber(appliance.projectedKwh)} kWh</strong> · {formatPeso(appliance.projectedKwh * rate)}</span>
                      </div>
                      <div className="mt-2 flex justify-end text-xs">
                        {changed && <span className={`font-semibold ${appliance.originalKwh >= appliance.projectedKwh ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {formatNumber(appliance.originalKwh - appliance.projectedKwh)} kWh {appliance.originalKwh >= appliance.projectedKwh ? 'saved' : 'added'}
                        </span>}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-blue-50 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(editingId === appliance.id ? null : appliance.id)
                            setEditForm(editingId === appliance.id ? null : editFormFor(appliance))
                            setEditError(null)
                            setActionError(null)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          {editingId === appliance.id ? <X size={14} /> : <Pencil size={14} />}
                          {editingId === appliance.id ? 'Close editor' : 'Edit details'}
                        </button>
                        {changed && (
                          <button
                            type="button"
                            disabled={savingId === appliance.id}
                            onClick={() => {
                              setSavingId(appliance.id)
                              setActionError(null)
                              setSavedId(null)
                              void saveAppliance({
                                name: appliance.name,
                                wattage: appliance.wattage,
                                quantity: appliance.quantity,
                                hoursPerDay: appliance.proposedHours,
                                daysPerMonth: appliance.daysPerMonth,
                              }, appliance.id).then(() => {
                                setProposedHours((current) => {
                                  const next = { ...current }
                                  delete next[appliance.id]
                                  return next
                                })
                                setSavedId(appliance.id)
                              }).catch((cause: unknown) => {
                                setActionError(cause instanceof Error ? cause.message : `Could not save ${appliance.name}.`)
                              }).finally(() => setSavingId(null))
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                          >
                            {savingId === appliance.id ? <span className="animate-pulse">Saving…</span> : <><Save size={14} /> Save proposed hours</>}
                          </button>
                        )}
                        {savedId === appliance.id && <span role="status" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check size={14} /> Saved</span>}
                      </div>
                      {editingId === appliance.id && editForm && (
                        <form
                          noValidate
                          className="mt-4 rounded-xl bg-blue-50/70 p-4"
                          onSubmit={(event: FormEvent<HTMLFormElement>) => {
                            event.preventDefault()
                            const validationError = validateEditForm(editForm)
                            setEditError(validationError)
                            if (validationError) return
                            const input: ApplianceInput = {
                              name: editForm.name.trim(),
                              wattage: Number(editForm.wattage),
                              quantity: Number(editForm.quantity),
                              hoursPerDay: Number(editForm.hoursPerDay),
                              daysPerMonth: Number(editForm.daysPerMonth),
                            }
                            setSavingId(appliance.id)
                            setActionError(null)
                            void saveAppliance(input, appliance.id).then(() => {
                              setEditingId(null)
                              setEditForm(null)
                              setProposedHours((current) => {
                                const next = { ...current }
                                delete next[appliance.id]
                                return next
                              })
                              setSavedId(appliance.id)
                            }).catch((cause: unknown) => {
                              setActionError(cause instanceof Error ? cause.message : `Could not save ${appliance.name}.`)
                            }).finally(() => setSavingId(null))
                          }}
                        >
                          <p className="mb-3 text-xs font-bold text-blue-900">Saved appliance details</p>
                          {editError && <p role="alert" className="mb-3 text-xs text-rose-700">{editError}</p>}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field id={`edit-name-${appliance.id}`} label="Name" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
                            <Field id={`edit-watts-${appliance.id}`} label="Wattage (W)" type="number" min="0.01" step="0.01" value={editForm.wattage} onChange={(event) => setEditForm({ ...editForm, wattage: event.target.value })} />
                            <Field id={`edit-quantity-${appliance.id}`} label="Quantity" type="number" min="1" step="1" value={editForm.quantity} onChange={(event) => setEditForm({ ...editForm, quantity: event.target.value })} />
                            <Field id={`edit-hours-${appliance.id}`} label="Hours per day" type="number" min="0" max="24" step="0.25" value={editForm.hoursPerDay} onChange={(event) => setEditForm({ ...editForm, hoursPerDay: event.target.value })} />
                            <Field id={`edit-days-${appliance.id}`} label="Days per month" type="number" min="0" max="31" step="1" value={editForm.daysPerMonth} onChange={(event) => setEditForm({ ...editForm, daysPerMonth: event.target.value })} />
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button type="submit" disabled={savingId === appliance.id} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                              <Save size={14} /> {savingId === appliance.id ? 'Saving…' : 'Save details'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )
                })}
              </div>
              )}
            </SectionCard>

            <div className="space-y-5">
              <SectionCard title="Energy-saving ideas" description="Suggestions based on your appliance details.">
                {recommendations.length === 0 ? (
                  <EmptyState>Enter a positive appliance usage schedule to see recommendations.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((appliance, index) => {
                      const currentHours = proposedHours[appliance.id] ?? appliance.hoursPerDay
                      const reductionHours = Math.min(1, currentHours)
                      const suggestedSaving = calculateMonthlyKwh(
                        appliance.wattage,
                        appliance.quantity,
                        reductionHours,
                        appliance.daysPerMonth,
                      )
                      return (
                        <div key={appliance.id} className="flex gap-3 rounded-xl bg-blue-50/70 p-3.5">
                          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-blue-700 shadow-sm">
                            {index === 0 ? <TrendingDown size={17} /> : <Sparkles size={16} />}
                          </span>
                          <div className="min-w-0 flex-1">
                          <p className="text-xs leading-5 text-blue-700">
                            <strong className="text-blue-950">{appliance.name}</strong> {index === 0 ? 'uses the most energy among listed appliances.' : `is ranked #${index + 1} by estimated use.`}{currentHours > 0
                              ? <> Reducing the current plan by {formatNumber(reductionHours)} hour{reductionHours === 1 ? '' : 's'}/day saves about <strong className="text-blue-950">{formatNumber(suggestedSaving)} kWh</strong> or <strong className="text-blue-950">{formatPeso(suggestedSaving * rate)}</strong> monthly.</>
                              : ' is already set to 0 hours/day in your current plan.'}
                          </p>
                          {currentHours > 0 && (
                            <button
                              type="button"
                              onClick={() => setProposedHours((current) => ({
                                ...current,
                                [appliance.id]: Math.max(0, currentHours - reductionHours),
                              }))}
                              className="mt-2 text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                            >
                              Apply idea to plan
                            </button>
                          )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </SectionCard>
              {household && billedDifference !== null && (
                <SectionCard title="Bill comparison" description="A quick check against your latest actual billed consumption.">
                  <p className="text-sm leading-6 text-blue-700">
                    Your appliance estimates total <strong className="text-blue-950">{formatNumber(Math.abs(billedDifference))} kWh {billedDifference >= 0 ? 'above' : 'below'}</strong> the billed {formatNumber(household.monthlyConsumption)} kWh.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-blue-500">This gap can help identify missing appliances or refine wattage and usage details. Appliance totals are estimates, not a bill forecast.</p>
                </SectionCard>
              )}
              <div className="rounded-2xl bg-blue-800 p-5 text-white">
                <div className="flex items-center gap-2 text-blue-200"><ArrowDown size={17} /><span className="text-xs font-semibold uppercase tracking-wider">Scenario summary</span></div>
                <p className="mt-3 text-lg font-bold">{formatNumber(Math.abs(savedKwh))} kWh/mo projected {savedKwh >= 0 ? 'reduction' : 'increase'}</p>
                <p className="mt-1 text-sm text-blue-200">{formatPeso(Math.abs(savedKwh * rate))} estimated {savedKwh >= 0 ? 'bill-equivalent savings' : 'additional cost'} at ₱{formatNumber(rate, 2)}/kWh.</p>
                <Link to="/reports" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-blue-200">
                  View results and report <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
