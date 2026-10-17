import { useMemo } from 'react'
import { ArrowDown, ArrowRight, RotateCcw, SlidersHorizontal, Sparkles, TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, PageHeading, SectionCard } from '../components/Ui'
import { useEnergy } from '../data/EnergyContext'
import { calculateMonthlyKwh, formatNumber, formatPeso, rankAppliances } from '../lib/calculations'

export function Optimization() {
  const { household, appliances, loading, proposedHours, setProposedHours, resetProposedHours } = useEnergy()
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
  const originalKwh = ranked.reduce((sum, appliance) => sum + appliance.originalKwh, 0)
  const projectedKwh = projected.reduce((sum, appliance) => sum + appliance.projectedKwh, 0)
  const savedKwh = originalKwh - projectedKwh
  const recommendations = ranked.filter((appliance) => appliance.originalKwh > 0).slice(0, 3)

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
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            <RotateCcw size={15} /> Reset scenario
          </button>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 text-xs leading-5 text-blue-600">
        <SlidersHorizontal size={16} className="mt-0.5 shrink-0 text-blue-500" />
        <p><strong className="text-blue-900">Simulation only.</strong> Proposed hours stay in temporary React state and are never saved to Supabase. Your original appliance records remain unchanged.</p>
      </div>

      {ranked.length === 0 ? (
        <SectionCard title="Appliance ranking" description="Add appliances in the dashboard to start comparing.">
          <EmptyState>No saved appliance data yet. <Link to="/" className="font-semibold text-blue-700 underline underline-offset-2">Go to Dashboard</Link> to add appliances.</EmptyState>
        </SectionCard>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
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
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard title="Appliance usage simulator" description="Ranked by original monthly energy consumption, highest first.">
              <div className="space-y-5">
                {projected.map((appliance, index) => {
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
                    </div>
                  )
                })}
              </div>
            </SectionCard>

            <div className="space-y-5">
              <SectionCard title="Energy-saving ideas" description="Suggestions based on your appliance details.">
                {recommendations.length === 0 ? (
                  <EmptyState>Enter a positive appliance usage schedule to see recommendations.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((appliance, index) => {
                      const reductionHours = Math.min(1, appliance.hoursPerDay)
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
                          <p className="text-xs leading-5 text-blue-700">
                            <strong className="text-blue-950">{appliance.name}</strong> {index === 0 ? 'uses the most energy among listed appliances.' : `is ranked #${index + 1} by estimated use.`} Reducing use by {formatNumber(reductionHours)} hour{reductionHours === 1 ? '' : 's'}/day saves about <strong className="text-blue-950">{formatNumber(suggestedSaving)} kWh</strong> or <strong className="text-blue-950">{formatPeso(suggestedSaving * rate)}</strong> monthly.
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </SectionCard>
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
