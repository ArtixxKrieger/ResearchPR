import { useMemo } from 'react'
import { Printer, TrendingDown } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, PageHeading, SectionCard } from '../components/Ui'
import { useEnergy } from '../data/EnergyContext'
import { calculateMonthlyKwh, formatNumber, formatPeso, rankAppliances } from '../lib/calculations'

export function Reports() {
  const { household, appliances, loading, proposedHours } = useEnergy()
  const ranked = useMemo(() => rankAppliances(appliances), [appliances])
  const originalKwh = ranked.reduce((total, item) => total + item.originalKwh, 0)
  const rate = household?.rate ?? 12
  const chartData = ranked.map((item) => {
    const hours = proposedHours[item.id] ?? item.hoursPerDay
    const projected = calculateMonthlyKwh(item.wattage, item.quantity, hours, item.daysPerMonth)
    return { id: item.id, appliance: item.name, original: item.originalKwh, projected }
  })
  const projectedKwh = chartData.reduce((total, item) => total + item.projected, 0)
  const savedKwh = originalKwh - projectedKwh
  const savedPercent = originalKwh > 0 ? (savedKwh / originalKwh) * 100 : 0
  const recommendations = ranked.filter((item) => item.originalKwh > 0).slice(0, 3)
  const projectedByAppliance = new Map(chartData.map((chartItem) => [chartItem.id, chartItem.projected]))

  if (loading) return <LoadingState />

  return (
    <>
      <PageHeading
        eyebrow="Research summary"
        title="Results & reports"
        description="Compare appliance-based baseline estimates with your simulated optimized scenario."
        action={
          <button type="button" onClick={() => window.print()} disabled={!appliances.length} className="no-print inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
            <Printer size={16} /> Print report
          </button>
        }
      />

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        <strong>Projections, not guaranteed outcomes.</strong> Results reflect the temporary proposed hours set in the optimizer. Without a changed schedule, projected use matches the original estimate. Proposed hours are never saved to Supabase.
      </div>

      {ranked.length === 0 ? (
        <SectionCard title="No appliance results" description="Save appliance usage in the dashboard to generate a report.">
          <EmptyState><Link to="/" className="font-semibold text-blue-700 underline underline-offset-2">Go to Dashboard</Link> to record appliance schedules and build a projected report.</EmptyState>
        </SectionCard>
      ) : (
        <div className="print-report space-y-5">
          <div className="hidden print:block">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Pagsibol 4A Subdivision · Naic, Cavite</p>
            <h1 className="mt-2 text-2xl font-bold">Household Energy Optimization — Projected Report</h1>
            <p className="mt-1 text-sm">Prepared {new Date().toLocaleDateString('en-PH')}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Original estimated use" value={`${formatNumber(originalKwh)} kWh`} note="Monthly appliance baseline" />
            <Metric label="Optimized projection" value={`${formatNumber(projectedKwh)} kWh`} note="Based on proposed hours" />
            <Metric
              label={savedKwh >= 0 ? 'Projected kWh saved' : 'Projected kWh increase'}
              value={`${formatNumber(Math.abs(savedKwh))} kWh`}
              note="Estimated monthly difference"
            />
            <Metric
              label={savedKwh >= 0 ? 'Estimated ₱ saved' : 'Estimated additional cost'}
              value={formatPeso(Math.abs(savedKwh * rate))}
              note={`${formatNumber(Math.abs(savedPercent))}% projected ${savedKwh >= 0 ? 'reduction' : 'increase'}`}
              highlight={savedKwh >= 0}
            />
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <SectionCard title="Consumption by appliance" description="Monthly baseline compared with the proposed-hours projection.">
              <div className="h-80 w-full" role="img" aria-label="Bar chart comparing original and projected monthly kWh use per appliance">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }} barGap={4}>
                    <CartesianGrid stroke="#e7efff" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="appliance" tick={{ fill: '#527099', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#7891b2', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [`${formatNumber(Number(value))} kWh`, '']} contentStyle={{ borderRadius: 12, borderColor: '#dbeafe' }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#31527c' }} />
                    <Bar dataKey="original" name="Original" fill="#93c5fd" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="projected" name="Optimized (projected)" fill="#2563eb" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Actual billed info" description="Recorded utility bill baseline; shown separately from appliance estimate.">
              {household ? (
                <div className="space-y-3">
                  <ReportLine label="Billed monthly consumption" value={`${formatNumber(household.monthlyConsumption)} kWh`} />
                  <ReportLine label="Actual bill amount" value={formatPeso(household.billAmount)} />
                  <ReportLine label="Entered rate" value={`${formatPeso(rate)} / kWh`} />
                  <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-600">
                    Appliance baseline: <strong className="text-blue-900">{formatNumber(originalKwh)} kWh</strong>. It is an independent estimate and may differ from billed consumption.
                  </div>
                </div>
              ) : (
                <EmptyState>No actual billed info saved. Appliance projections can still be reviewed.</EmptyState>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Appliance ranking & recommendations" description="Sorted from highest to lowest estimated monthly consumption.">
            <div className="divide-y divide-blue-50">
              {ranked.map((item, index) => {
                const projected = projectedByAppliance.get(item.id) ?? item.originalKwh
                const reductionHours = Math.min(1, item.hoursPerDay)
                const suggestedSaving = calculateMonthlyKwh(item.wattage, item.quantity, reductionHours, item.daysPerMonth)
                return (
                  <div key={item.id} className="grid gap-3 py-3 first:pt-0 sm:grid-cols-[2fr_1fr_1fr_3fr] sm:items-center">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-md bg-blue-50 text-[11px] font-bold text-blue-700">{index + 1}</span>
                      <span className="text-sm font-semibold text-blue-950">{item.name}</span>
                    </div>
                    <ReportLine label="Original" value={`${formatNumber(item.originalKwh)} kWh`} />
                    <ReportLine label="Projected" value={`${formatNumber(projected)} kWh`} />
                    <p className="text-xs leading-5 text-blue-600">
                      {recommendations.includes(item)
                      ? `Reducing by ${formatNumber(reductionHours)} hour${reductionHours === 1 ? '' : 's'}/day saves about ${formatNumber(suggestedSaving)} kWh (${formatPeso(suggestedSaving * rate)}) monthly.`
                        : 'Consider reviewing operating hours to reduce estimated consumption.'}
                    </p>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${savedKwh >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <TrendingDown size={18} className="mt-0.5 shrink-0" />
            <p className="leading-6"><strong>Projected outcome:</strong> a {formatNumber(Math.abs(savedPercent))}% {savedKwh >= 0 ? 'reduction' : 'increase'} ({formatNumber(Math.abs(savedKwh))} kWh/month), equivalent to approximately {formatPeso(Math.abs(savedKwh * rate))} {savedKwh >= 0 ? 'in savings' : 'in additional cost'} per month at the entered rate. These calculations are estimates, not a promise of actual bill reduction.</p>
          </div>
        </div>
      )}
    </>
  )
}

function Metric({ label, value, note, highlight = false }: { label: string; value: string; note: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? 'border-emerald-200 bg-emerald-50' : 'border-blue-100 bg-white'}`}>
      <p className={`text-xs font-semibold ${highlight ? 'text-emerald-700' : 'text-blue-500'}`}>{label}</p>
      <p className={`mt-3 text-xl font-bold tracking-tight ${highlight ? 'text-emerald-900' : 'text-blue-950'}`}>{value}</p>
      <p className={`mt-1 text-xs ${highlight ? 'text-emerald-700' : 'text-blue-400'}`}>{note}</p>
    </div>
  )
}

function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-blue-500">{label}</span>
      <span className="text-sm font-bold text-blue-900">{value}</span>
    </div>
  )
}
