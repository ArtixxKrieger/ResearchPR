import { useMemo, useState } from 'react'
import { ArrowRight, Download, Printer, Search, TrendingDown } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, PageHeading, SectionCard } from '../components/Ui'
import { useEnergy } from '../data/EnergyContext'
import { logUsageEvent } from '../lib/research'
import { calculateMonthlyKwh, formatNumber, formatPeso, rankAppliances } from '../lib/calculations'

function ApplianceAxisLabel({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number
  y?: number
  payload?: { value?: unknown }
}) {
  const label = String(payload?.value ?? '')
  const words = label.split(/\s+/)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > 15 && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  const visibleLines = lines.slice(0, 2)
  if (lines.length > 2) visibleLines[1] = `${visibleLines[1].slice(0, 13)}…`

  return (
    <g transform={`translate(${x},${y})`}>
      <text className="report-chart-label" textAnchor="end" fontSize={11} fontWeight={500}>
        {visibleLines.map((part, index) => (
          <tspan key={`${part}-${index}`} x={-10} dy={visibleLines.length === 1 ? 4 : index === 0 ? -3 : 13}>
            {part}
          </tspan>
        ))}
      </text>
    </g>
  )
}

export function Reports() {
  const { user, household, appliances, loading, proposedHours } = useEnergy()
  const [applianceSearch, setApplianceSearch] = useState('')
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
  const topThree = ranked.slice(0, 3).reduce((sum, item) => sum + item.originalKwh, 0)
  const topThreeShare = originalKwh > 0 ? topThree / originalKwh * 100 : 0
  const billGap = household ? originalKwh - household.monthlyConsumption : null
  const chartLimit = 8
  const visibleChartData = chartData.slice(0, chartLimit)
  const filteredRanked = ranked.filter((item) => item.name.toLowerCase().includes(applianceSearch.trim().toLowerCase()))

  function downloadCsv() {
    const rows = [
      ['Appliance', 'Wattage (W)', 'Quantity', 'Original hours/day', 'Proposed hours/day', 'Days/month', 'Original kWh/month', 'Projected kWh/month', 'Projected cost (PHP)'],
      ...ranked.map((item) => {
        const projected = projectedByAppliance.get(item.id) ?? item.originalKwh
        const safeName = /^[=+\-@\t\r]/.test(item.name) ? `'${item.name}` : item.name
        return [
          safeName,
          String(item.wattage),
          String(item.quantity),
          String(item.hoursPerDay),
          String(proposedHours[item.id] ?? item.hoursPerDay),
          String(item.daysPerMonth),
          item.originalKwh.toFixed(2),
          projected.toFixed(2),
          (projected * rate).toFixed(2),
        ]
      }),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'pagsibol-energy-report.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    logUsageEvent(user?.id, 'report_exported', {
      applianceCount: ranked.length,
      originalKwh: Number(originalKwh.toFixed(2)),
      projectedKwh: Number(projectedKwh.toFixed(2)),
      savedKwh: Number(savedKwh.toFixed(2)),
    })
  }

  function printReport() {
    logUsageEvent(user?.id, 'report_printed', {
      applianceCount: ranked.length,
      originalKwh: Number(originalKwh.toFixed(2)),
      projectedKwh: Number(projectedKwh.toFixed(2)),
      savedKwh: Number(savedKwh.toFixed(2)),
    })
    window.print()
  }

  if (loading) return <LoadingState />

  return (
    <>
      <PageHeading
        eyebrow="Research summary"
        title="Results & reports"
        description="Review monthly usage estimates, planned changes, and bill comparisons in one report."
        action={
          <div className="no-print flex w-full flex-wrap gap-2 sm:w-auto">
            <button type="button" onClick={downloadCsv} disabled={!appliances.length} className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4">
              <Download size={16} /> Export CSV
            </button>
            <button type="button" onClick={printReport} disabled={!appliances.length} className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4">
              <Printer size={16} /> Print report
            </button>
          </div>
        }
      />

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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            <Metric label="Top 3 appliance share" value={`${formatNumber(topThreeShare)}%`} note={`${formatNumber(topThree)} kWh of the appliance estimate`} />
            {household && billGap !== null && (
              <Metric
                label={billGap >= 0 ? 'Estimate above bill' : 'Estimate below bill'}
                value={`${formatNumber(Math.abs(billGap))} kWh`}
                note={`Actual billed use: ${formatNumber(household.monthlyConsumption)} kWh`}
              />
            )}
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <SectionCard
              title="Consumption by appliance"
              description={`Comparing the top ${visibleChartData.length} of ${chartData.length} appliances by monthly use.`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-400">Monthly energy · kWh</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Chart legend">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-blue-600">
                    <span className="size-2.5 rounded-sm bg-blue-300" /> Original
                  </span>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-blue-600">
                    <span className="size-2.5 rounded-sm bg-amber-500" /> Planned
                  </span>
                </div>
              </div>
              <div className="report-chart w-full" style={{ height: Math.min(520, Math.max(250, visibleChartData.length * 64)) }} role="img" aria-label={`Bar chart comparing monthly energy use for the top ${visibleChartData.length} appliances`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={visibleChartData}
                    margin={{ top: 8, right: 14, left: 0, bottom: 8 }}
                    barGap={5}
                    barCategoryGap="32%"
                  >
                    <CartesianGrid className="report-chart-grid" strokeDasharray="2 5" vertical horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="appliance"
                      width={132}
                      tick={<ApplianceAxisLabel />}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(value) => [`${formatNumber(Number(value), 2)} kWh`, '']}
                      labelFormatter={(label) => String(label)}
                      cursor={{ fill: 'rgba(148, 163, 184, 0.10)', radius: 8 }}
                      contentStyle={{ borderRadius: 12, borderColor: '#dbeafe', padding: '10px 12px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)' }}
                      labelStyle={{ marginBottom: 5, fontWeight: 700 }}
                    />
                    <Bar dataKey="original" name="Original" fill="#93c5fd" radius={[0, 6, 6, 0]} maxBarSize={14} />
                    <Bar dataKey="projected" name="Planned" fill="#f59e0b" radius={[0, 6, 6, 0]} maxBarSize={14} />
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

          <SectionCard
            title="Usage breakdown & recommendations"
            description={`Showing ${filteredRanked.length} of ${ranked.length}; sorted by estimated consumption.`}
            action={<Link to="/" className="no-print inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">Edit appliance data <ArrowRight size={14} /></Link>}
          >
            <label className="no-print mb-4 flex max-w-md items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
              <Search size={16} className="shrink-0 text-blue-400" />
              <input
                type="search"
                value={applianceSearch}
                onChange={(event) => setApplianceSearch(event.target.value)}
                placeholder="Find an appliance"
                aria-label="Filter appliance report"
                className="min-w-0 flex-1 bg-transparent text-sm text-blue-950 outline-none placeholder:text-blue-300"
              />
            </label>
            {filteredRanked.length === 0 ? (
              <EmptyState>No appliances match “{applianceSearch}”. Try a different search.</EmptyState>
            ) : (
              <div className="divide-y divide-blue-50">
              {filteredRanked.map((item, index) => {
                const projected = projectedByAppliance.get(item.id) ?? item.originalKwh
                const share = originalKwh > 0 ? item.originalKwh / originalKwh * 100 : 0
                const reductionHours = Math.min(1, proposedHours[item.id] ?? item.hoursPerDay)
                const suggestedSaving = calculateMonthlyKwh(item.wattage, item.quantity, reductionHours, item.daysPerMonth)
                return (
                  <div key={item.id} className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[minmax(160px,1.6fr)_repeat(2,minmax(100px,0.8fr))_minmax(140px,1fr)] sm:items-center">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-md bg-blue-50 text-[11px] font-bold text-blue-700">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-blue-950">{item.name}</span>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-blue-100">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${share}%` }} />
                        </div>
                        <span className="mt-1 block text-[11px] text-blue-400">{formatNumber(share)}% of total estimate</span>
                      </div>
                    </div>
                    <ReportLine label="Original" value={`${formatNumber(item.originalKwh)} kWh`} />
                    <ReportLine label="Planned" value={`${formatNumber(projected)} kWh`} />
                    <p className="text-xs leading-5 text-blue-600">
                      {recommendations.includes(item)
                        ? reductionHours > 0
                          ? `Try reducing the current plan by ${formatNumber(reductionHours)} h/day to save about ${formatNumber(suggestedSaving)} kWh (${formatPeso(suggestedSaving * rate)}) monthly.`
                          : 'This appliance is already set to 0 hours/day in the current plan.'
                        : 'Review the schedule to find potential savings.'}
                    </p>
                  </div>
                )
              })}
              </div>
            )}
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
