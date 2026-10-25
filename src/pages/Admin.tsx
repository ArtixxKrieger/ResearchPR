import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Home,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeading, SectionCard } from '../components/Ui'
import { useEnergy } from '../data/EnergyContext'
import {
  buildResearchView,
  type Participant,
  type ParticipantStatus,
} from '../lib/adminMetrics'
import { formatNumber, formatPeso } from '../lib/calculations'
import { fetchAdminDataset, type AdminDataset, type AdminEventRow } from '../lib/research'

const statusLabels: Record<ParticipantStatus, string> = {
  complete: 'Complete',
  'bill-only': 'Bill only',
  'appliance-only': 'Appliances only',
  'no-data': 'No data yet',
}

const statusStyles: Record<ParticipantStatus, string> = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'bill-only': 'border-amber-200 bg-amber-50 text-amber-700',
  'appliance-only': 'border-blue-200 bg-blue-50 text-blue-700',
  'no-data': 'border-slate-200 bg-slate-50 text-slate-600',
}

const eventLabels: Record<string, string> = {
  signed_up: 'Created account',
  signed_in: 'Signed in',
  page_view: 'Viewed page',
  household_saved: 'Saved bill info',
  appliance_saved: 'Saved appliance',
  appliance_deleted: 'Removed appliance',
  report_exported: 'Exported report',
  report_printed: 'Printed report',
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const time = Date.parse(value)
  return Number.isFinite(time) ? dateTimeFormatter.format(time) : '—'
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function money(value: number | null): string {
  return value === null ? '—' : formatPeso(value)
}

function measured(value: number | null, digits = 1): string {
  return value === null ? '—' : formatNumber(value, digits)
}

function percent(value: number | null): string {
  return value === null ? '—' : `${formatNumber(value)}%`
}

function initials(name: string, email: string): string {
  const source = name.trim() || email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return (parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?')
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

function downloadCsv(filename: string, rows: unknown[][]): void {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function describeEvent(event: AdminEventRow): string {
  const detail = event.detail ?? {}
  if (event.event_type === 'page_view') {
    return typeof detail.path === 'string' ? detail.path : ''
  }
  if (event.event_type === 'household_saved') {
    return `${measured(finiteNumber(detail.monthlyConsumption))} kWh · ${money(finiteNumber(detail.billAmount))}`
  }
  if (event.event_type === 'appliance_saved') {
    const action = detail.action === 'update' ? 'updated' : 'added'
    return `${String(detail.name ?? 'Appliance')} · ${measured(finiteNumber(detail.hoursPerDay))} h/day · ${action}`
  }
  if (event.event_type === 'appliance_deleted') {
    return String(detail.name ?? 'Appliance')
  }
  if (event.event_type === 'report_exported' || event.event_type === 'report_printed') {
    return `${measured(finiteNumber(detail.savedKwh))} kWh planned saving`
  }
  return Object.keys(detail).length > 0 ? JSON.stringify(detail) : ''
}

function SummaryTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Users
  tone: 'blue' | 'amber' | 'emerald' | 'violet'
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">{label}</p>
        <span className={`grid size-8 place-items-center rounded-xl ${tones[tone]}`}><Icon size={16} /></span>
      </div>
      <p className="mt-3 break-words text-2xl font-bold leading-tight tracking-tight text-blue-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-blue-400">{detail}</p>
    </div>
  )
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-blue-950">{value}</p>
      {detail && <p className="mt-0.5 truncate text-[11px] text-blue-400">{detail}</p>}
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400">{label}</p>
      <p className="mt-0.5 break-words text-sm text-blue-900">{value}</p>
    </div>
  )
}

function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-4">
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-500">{title}</h4>
      {children}
    </div>
  )
}

function ParticipantDetails({
  participant,
  events,
}: {
  participant: Participant
  events: AdminEventRow[]
}) {
  const household = participant.household
  const scenario = participant.scenario
  const eventEntries = Object.entries(participant.eventCounts).sort((left, right) => right[1] - left[1])

  return (
    <div className="mt-4 space-y-4 border-t border-blue-50 pt-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <DetailPanel title="Profile & contact">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailStat label="Display name" value={participant.displayName} />
            <DetailStat label="Email" value={participant.email || '—'} />
            <DetailStat label="Phone" value={participant.phone || '—'} />
            <DetailStat label="Email confirmed" value={participant.emailConfirmed ? 'Yes' : 'No'} />
            <div className="sm:col-span-2">
              <DetailStat label="Home address" value={participant.homeAddress || '—'} />
            </div>
            <DetailStat label="Signed up" value={formatDateTime(participant.signedUpAt)} />
            <DetailStat label="Last sign-in" value={formatDateTime(participant.lastSignInAt)} />
            <DetailStat
              label="Days since signup"
              value={participant.daysSinceSignup === null ? '—' : String(participant.daysSinceSignup)}
            />
            <DetailStat label="Last active" value={formatDateTime(participant.lastActiveAt)} />
          </div>
        </DetailPanel>

        <DetailPanel title="Billed baseline">
          {household ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailStat label="Billed consumption" value={`${measured(household.billedKwh)} kWh`} />
              <DetailStat label="Bill amount" value={money(household.billAmount)} />
              <DetailStat label="Entered rate" value={`${formatPeso(household.rate)} / kWh`} />
              <DetailStat label="Effective rate" value={household.effectiveRate === null ? '—' : `${formatPeso(household.effectiveRate)} / kWh`} />
              <DetailStat label="Appliance estimate" value={`${measured(participant.applianceKwh)} kWh`} />
              <DetailStat label="Estimate vs bill" value={percent(participant.coveragePercent)} />
              <DetailStat label="Estimate cost" value={money(household ? participant.applianceKwh * household.rate : null)} />
              <DetailStat
                label="Top appliance"
                value={participant.topAppliance
                  ? `${participant.topAppliance.name} · ${measured(participant.topAppliance.kwh)} kWh`
                  : '—'}
              />
              <DetailStat label="Bill info updated" value={formatDateTime(household.updatedAt)} />
            </div>
          ) : (
            <p className="text-sm text-blue-500">No billed baseline saved yet.</p>
          )}
        </DetailPanel>

        <DetailPanel title="Optimization scenario">
          {scenario ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailStat label="Baseline" value={`${measured(scenario.baselineKwh)} kWh`} />
              <DetailStat label="Projected" value={`${measured(scenario.projectedKwh)} kWh`} />
              <DetailStat label="Planned saving" value={`${measured(scenario.savedKwh)} kWh`} />
              <DetailStat label="Saving percent" value={percent(scenario.savedPercent)} />
              <div className="sm:col-span-2">
                <DetailStat label="Scenario updated" value={formatDateTime(scenario.updatedAt)} />
              </div>
              {scenario.hours.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-blue-400">Proposed hours</p>
                  <ul className="space-y-1.5">
                    {scenario.hours.map((hour) => (
                      <li key={hour.name} className="flex items-center justify-between gap-3 text-xs text-blue-700">
                        <span className="min-w-0 truncate">{hour.name}</span>
                        <span className={`shrink-0 font-semibold ${hour.proposedHours < hour.originalHours ? 'text-emerald-700' : 'text-blue-900'}`}>
                          {formatNumber(hour.originalHours)} → {formatNumber(hour.proposedHours)} h
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-blue-500">No optimization scenario saved yet.</p>
          )}
        </DetailPanel>
      </div>

      <DetailPanel title={`Appliance inventory · ${participant.applianceCount}`}>
        {participant.appliances.length > 0 ? (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-blue-400">
                  <th className="px-1 py-2 font-bold">Appliance</th>
                  <th className="px-1 py-2 font-bold">Wattage</th>
                  <th className="px-1 py-2 font-bold">Qty</th>
                  <th className="px-1 py-2 font-bold">Hours/day</th>
                  <th className="px-1 py-2 font-bold">Days/month</th>
                  <th className="px-1 py-2 font-bold">kWh/month</th>
                  <th className="px-1 py-2 font-bold">Cost</th>
                  <th className="px-1 py-2 font-bold">Share</th>
                  <th className="px-1 py-2 font-bold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {participant.appliances.map((appliance) => (
                  <tr key={appliance.id} className="text-blue-800">
                    <td className="px-1 py-2 font-semibold text-blue-950">{appliance.name}</td>
                    <td className="px-1 py-2">{formatNumber(appliance.wattage)} W</td>
                    <td className="px-1 py-2">{appliance.quantity}</td>
                    <td className="px-1 py-2">{formatNumber(appliance.hoursPerDay)}</td>
                    <td className="px-1 py-2">{appliance.daysPerMonth}</td>
                    <td className="px-1 py-2 font-semibold">{measured(appliance.kwh)}</td>
                    <td className="px-1 py-2">{money(appliance.cost)}</td>
                    <td className="px-1 py-2">{formatNumber(appliance.sharePercent)}%</td>
                    <td className="px-1 py-2">{formatDateTime(appliance.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-blue-100 text-blue-950">
                  <td className="px-1 py-2 font-bold" colSpan={5}>Total</td>
                  <td className="px-1 py-2 font-bold">{measured(participant.applianceKwh)}</td>
                  <td className="px-1 py-2 font-bold">{money(participant.applianceCost)}</td>
                  <td className="px-1 py-2 font-bold">100%</td>
                  <td className="px-1 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-sm text-blue-500">No appliances recorded.</p>
        )}
      </DetailPanel>

      <DetailPanel title={`Tracked activity · ${participant.eventTotal} events`}>
        {eventEntries.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="flex flex-wrap gap-1.5">
              {eventEntries.map(([type, count]) => (
                <span key={type} className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  {eventLabels[type] ?? type}
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-blue-900">{count}</span>
                </span>
              ))}
            </div>
            <div className="min-w-0">
              {events.length > 0 ? (
                <ul className="space-y-1.5">
                  {events.slice(0, 10).map((event, index) => (
                    <li key={`${event.created_at}-${index}`} className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-blue-800">
                        <span className="font-semibold">{eventLabels[event.event_type] ?? event.event_type}</span>
                        {describeEvent(event) && <span className="text-blue-500"> · {describeEvent(event)}</span>}
                      </span>
                      <span className="shrink-0 text-[11px] text-blue-400">{formatDateTime(event.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-blue-500">Newest events appear here after the next activity.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-blue-500">No tracked activity yet.</p>
        )}
      </DetailPanel>
    </div>
  )
}

type StatusFilter = 'all' | ParticipantStatus
type SortKey = 'recent' | 'bill' | 'usage' | 'name'

export function Admin() {
  const { user, isAdmin, adminLoading } = useEnergy()
  const [dataset, setDataset] = useState<AdminDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortKey>('recent')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function loadDataset(refresh = false) {
    setError(null)
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      setDataset(await fetchAdminDataset())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the research dataset.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadDataset()
  }, [])

  const view = useMemo(() => (dataset ? buildResearchView(dataset) : null), [dataset])

  const filteredParticipants = useMemo(() => {
    if (!view) return []
    const term = search.trim().toLowerCase()
    const matches = view.participants.filter((participant) => {
      if (statusFilter !== 'all' && participant.status !== statusFilter) return false
      if (!term) return true
      return [participant.displayName, participant.email, participant.phone, participant.homeAddress]
        .some((value) => value.toLowerCase().includes(term))
    })
    const sorted = [...matches]
    if (sortBy === 'bill') sorted.sort((left, right) => (right.household?.billAmount ?? 0) - (left.household?.billAmount ?? 0))
    else if (sortBy === 'usage') sorted.sort((left, right) => right.applianceKwh - left.applianceKwh)
    else if (sortBy === 'name') sorted.sort((left, right) => left.displayName.localeCompare(right.displayName))
    return sorted
  }, [search, sortBy, statusFilter, view])

  const chartData = useMemo(() => {
    if (!view) return []
    return [...view.participants]
      .filter((participant) => participant.household || participant.applianceCount > 0)
      .sort((left, right) => Math.max(right.household?.billedKwh ?? 0, right.applianceKwh)
        - Math.max(left.household?.billedKwh ?? 0, left.applianceKwh))
      .slice(0, 8)
      .map((participant) => ({
        name: participant.displayName.length > 17
          ? `${participant.displayName.slice(0, 16)}…`
          : participant.displayName,
        billed: Number((participant.household?.billedKwh ?? 0).toFixed(2)),
        estimate: Number(participant.applianceKwh.toFixed(2)),
      }))
  }, [view])

  function exportParticipants() {
    if (!view) return
    downloadCsv('pagsibol-participants.csv', [
      [
        'Participant ID', 'Display name', 'Email', 'Phone', 'Home address', 'Signed up',
        'Last sign-in', 'Email confirmed', 'Data status', 'Billed kWh', 'Bill amount (PHP)',
        'Entered rate (PHP/kWh)', 'Effective rate (PHP/kWh)', 'Appliance count',
        'Appliance estimate kWh', 'Appliance estimate cost (PHP)', 'Coverage of bill (%)',
        'Top appliance', 'Top appliance kWh', 'Scenario baseline kWh', 'Scenario projected kWh',
        'Scenario saved kWh', 'Scenario saved (%)', 'Scenario updated', 'Page views', 'Sign-ins',
        'Tracked events', 'Last event', 'Last active', 'Days since signup',
      ],
      ...view.participants.map((participant) => [
        participant.userId,
        participant.displayName,
        participant.email,
        participant.phone,
        participant.homeAddress,
        participant.signedUpAt ?? '',
        participant.lastSignInAt ?? '',
        participant.emailConfirmed ? 'yes' : 'no',
        participant.status,
        participant.household?.billedKwh ?? '',
        participant.household?.billAmount ?? '',
        participant.household?.rate ?? '',
        participant.household?.effectiveRate ?? '',
        participant.applianceCount,
        participant.applianceKwh.toFixed(2),
        participant.applianceCost.toFixed(2),
        participant.coveragePercent === null ? '' : participant.coveragePercent.toFixed(2),
        participant.topAppliance?.name ?? '',
        participant.topAppliance?.kwh.toFixed(2) ?? '',
        participant.scenario?.baselineKwh.toFixed(2) ?? '',
        participant.scenario?.projectedKwh.toFixed(2) ?? '',
        participant.scenario?.savedKwh.toFixed(2) ?? '',
        participant.scenario?.savedPercent.toFixed(2) ?? '',
        participant.scenario?.updatedAt ?? '',
        participant.pageViews,
        participant.signIns,
        participant.eventTotal,
        participant.lastEventAt ?? '',
        participant.lastActiveAt ?? '',
        participant.daysSinceSignup ?? '',
      ]),
    ])
  }

  function exportAppliances() {
    if (!view) return
    downloadCsv('pagsibol-appliances.csv', [
      [
        'Email', 'Display name', 'Appliance', 'Wattage (W)', 'Quantity', 'Hours/day',
        'Days/month', 'Monthly kWh', 'Monthly cost (PHP)', 'Share of estimate (%)', 'Added', 'Updated',
      ],
      ...view.participants.flatMap((participant) => participant.appliances.map((appliance) => [
        participant.email,
        participant.displayName,
        appliance.name,
        appliance.wattage,
        appliance.quantity,
        appliance.hoursPerDay,
        appliance.daysPerMonth,
        appliance.kwh.toFixed(2),
        appliance.cost === null ? '' : appliance.cost.toFixed(2),
        appliance.sharePercent.toFixed(2),
        appliance.createdAt,
        appliance.updatedAt,
      ])),
    ])
  }

  function exportActivity() {
    if (!view || !dataset) return
    const nameByUser = new Map(view.participants.map((participant) => [participant.userId, participant]))
    downloadCsv('pagsibol-activity.csv', [
      ['Email', 'Display name', 'Event', 'Detail', 'Recorded at'],
      ...dataset.recent_events.map((event) => {
        const participant = nameByUser.get(event.user_id)
        return [
          participant?.email ?? event.user_id,
          participant?.displayName ?? '',
          event.event_type,
          describeEvent(event),
          event.created_at,
        ]
      }),
    ])
  }

  if (adminLoading) {
    return <div role="status" className="rounded-2xl border border-blue-100 bg-white px-6 py-12 text-center text-sm text-blue-500">Checking administrator access…</div>
  }

  if (!isAdmin) {
    return (
      <SectionCard title="Administrator access required" description="This area is limited to the research administrator account.">
        <p className="flex items-center gap-2 text-sm text-blue-600">
          <AlertCircle size={16} /> Sign in with an account listed in <code className="rounded bg-blue-50 px-1.5 py-0.5">public.admin_users</code> to open the research dashboard.
        </p>
      </SectionCard>
    )
  }

  return (
    <div className="print-report">
      <PageHeading
        eyebrow="Study intelligence"
        title="Research admin"
        description="Every participant, their household data, saved scenarios, and study activity in one place."
        action={
          <div className="flex w-full flex-wrap gap-2 print:hidden sm:w-auto">
            <button
              type="button"
              onClick={() => void loadDataset(true)}
              disabled={refreshing}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60 sm:flex-none"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={exportParticipants}
              disabled={!view || view.participants.length === 0}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              <Download size={15} /> Participants CSV
            </button>
          </div>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <p>
          This view contains participant names, contact details, addresses, and consumption records.
          Exports are generated in your browser — store and share them only as allowed by the study
          consent and data-protection rules.
        </p>
      </div>

      {error && (
        <SectionCard
          title="Could not load the research dataset"
          description="The dashboard needs the research tables and admin functions from supabase/schema.sql."
          className="mb-5"
        >
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-blue-600">
            <li>Run the updated <code className="rounded bg-blue-50 px-1.5 py-0.5">supabase/schema.sql</code> in the Supabase SQL Editor.</li>
            <li>Confirm this account is listed in <code className="rounded bg-blue-50 px-1.5 py-0.5">public.admin_users</code>.</li>
            <li>Sign out and back in, then refresh this page.</li>
          </ol>
        </SectionCard>
      )}

      {loading ? (
        <div role="status" className="rounded-2xl border border-blue-100 bg-white px-6 py-12 text-center text-sm text-blue-500">Loading research dataset…</div>
      ) : view && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="Participants"
              value={String(view.summary.totalParticipants)}
              detail={`${view.summary.newLast7Days} joined in the last 7 days`}
              icon={Users}
              tone="blue"
            />
            <SummaryTile
              label="Households"
              value={String(view.summary.withHousehold)}
              detail={`${percent(view.summary.averageCoveragePercent)} of billed use explained by appliances`}
              icon={Home}
              tone="amber"
            />
            <SummaryTile
              label="Appliances recorded"
              value={String(view.summary.totalAppliances)}
              detail={`${measured(view.summary.totalApplianceKwh, 2)} kWh estimated per month`}
              icon={Zap}
              tone="emerald"
            />
            <SummaryTile
              label="Scenario engagement"
              value={String(view.summary.withScenario)}
              detail={`${view.summary.participantsSaving} participants planned savings · avg ${percent(view.summary.averageScenarioSavedPercent)}`}
              icon={Activity}
              tone="violet"
            />
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard
                title="Billed vs appliance estimate"
                description="Top participants by recorded electricity use. Differences are expected because the appliance estimate is independent of the bill."
              >
                {chartData.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center text-sm text-blue-500">No household data has been recorded yet.</p>
                ) : (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Chart legend">
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-blue-600">
                        <span className="size-2.5 rounded-sm bg-blue-300" /> Billed kWh
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-blue-600">
                        <span className="size-2.5 rounded-sm bg-amber-500" /> Appliance estimate
                      </span>
                    </div>
                    <div className="w-full" style={{ height: Math.max(240, chartData.length * 52) }} role="img" aria-label="Bar chart comparing billed and estimated monthly energy use per participant">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={chartData}
                          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                          barGap={4}
                          barCategoryGap="30%"
                        >
                          <CartesianGrid className="report-chart-grid" strokeDasharray="2 5" vertical horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={112}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                          />
                          <Tooltip
                            formatter={(value) => [`${formatNumber(Number(value), 2)} kWh`, '']}
                            contentStyle={{ borderRadius: 12, borderColor: '#dbeafe', padding: '10px 12px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)' }}
                            labelStyle={{ marginBottom: 5, fontWeight: 700 }}
                          />
                          <Bar dataKey="billed" name="Billed kWh" fill="#93c5fd" radius={[0, 6, 6, 0]} maxBarSize={12} />
                          <Bar dataKey="estimate" name="Appliance estimate" fill="#f59e0b" radius={[0, 6, 6, 0]} maxBarSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </SectionCard>
            </div>

            <SectionCard title="Study totals" description="Aggregated values for the research report.">
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Avg. monthly bill" value={money(view.summary.averageBill)} />
                <MiniStat label="Billed consumption" value={`${measured(view.summary.totalBilledKwh)} kWh`} />
                <MiniStat label="Participants active (7d)" value={String(view.summary.activeLast7Days)} detail={`${view.summary.totalParticipants} total`} />
                <MiniStat label="With appliances" value={String(view.summary.withAppliances)} detail={`${view.summary.totalAppliances} appliances`} />
                <MiniStat label="Estimate coverage" value={percent(view.summary.averageCoveragePercent)} detail="Appliance kWh vs bill" />
                <MiniStat label="Avg. planned saving" value={percent(view.summary.averageScenarioSavedPercent)} detail="Across saved scenarios" />
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Participants"
            description={`${filteredParticipants.length} of ${view.participants.length} shown. Expand a participant for profile, appliance, scenario, and activity details.`}
            action={
              <div className="flex flex-wrap gap-2 print:hidden">
                <button type="button" onClick={exportAppliances} disabled={view.summary.totalAppliances === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <Download size={13} /> Appliances
                </button>
                <button type="button" onClick={exportActivity} disabled={!dataset || dataset.recent_events.length === 0} title="Latest 30 tracked events per participant" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <Download size={13} /> Activity
                </button>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                  <Printer size={13} /> Print
                </button>
              </div>
            }
          >
            <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                <Search size={16} className="shrink-0 text-blue-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, phone, or address"
                  aria-label="Search participants"
                  className="min-w-0 flex-1 bg-transparent text-sm text-blue-950 outline-none placeholder:text-blue-300"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                aria-label="Filter by data status"
                className="min-h-10 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All data statuses</option>
                <option value="complete">Complete</option>
                <option value="bill-only">Bill only</option>
                <option value="appliance-only">Appliances only</option>
                <option value="no-data">No data yet</option>
              </select>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortKey)}
                aria-label="Sort participants"
                className="min-h-10 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="recent">Most recent activity</option>
                <option value="bill">Highest bill</option>
                <option value="usage">Highest appliance use</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            {filteredParticipants.length === 0 ? (
              <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-5 py-8 text-center text-sm leading-6 text-blue-500">
                No participants match the current filters.
              </p>
            ) : (
              <div className="divide-y divide-blue-50">
                {filteredParticipants.map((participant) => {
                  const isExpanded = expandedId === participant.userId
                  const household = participant.household
                  const events = dataset?.recent_events.filter((event) => event.user_id === participant.userId) ?? []
                  return (
                    <article key={participant.userId} className="py-4 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : participant.userId)}
                        aria-expanded={isExpanded}
                        className="w-full rounded-xl text-left transition hover:bg-blue-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      >
                        <div className="flex items-start justify-between gap-3 p-1">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-950 text-xs font-bold text-amber-300">
                              {initials(participant.displayName, participant.email)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-blue-950">{participant.displayName}</p>
                              <p className="truncate text-xs text-blue-500">{participant.email || 'No email on record'}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-blue-400">
                                <span>{participant.phone || 'No phone'}</span>
                                <span className="max-w-full truncate">{participant.homeAddress || 'No address'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusStyles[participant.status]}`}>
                              {statusLabels[participant.status]}
                            </span>
                            {isExpanded ? <ChevronUp size={16} className="text-blue-500" /> : <ChevronDown size={16} className="text-blue-500" />}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 p-1 sm:grid-cols-3 lg:grid-cols-5">
                          <MiniStat
                            label="Billed"
                            value={household ? `${measured(household.billedKwh)} kWh` : '—'}
                            detail={household ? money(household.billAmount) : 'No bill saved'}
                          />
                          <MiniStat
                            label="Appliance estimate"
                            value={`${measured(participant.applianceKwh)} kWh`}
                            detail={`${participant.applianceCount} recorded`}
                          />
                          <MiniStat
                            label="Coverage of bill"
                            value={percent(participant.coveragePercent)}
                            detail={participant.topAppliance ? `Top: ${participant.topAppliance.name}` : undefined}
                          />
                          <MiniStat
                            label="Planned saving"
                            value={participant.scenario ? `${measured(participant.scenario.savedKwh)} kWh` : '—'}
                            detail={participant.scenario ? percent(participant.scenario.savedPercent) : 'No scenario saved'}
                          />
                          <MiniStat
                            label="Last active"
                            value={formatDateTime(participant.lastActiveAt)}
                            detail={`${participant.eventTotal} tracked events`}
                          />
                        </div>
                      </button>
                      {isExpanded && <ParticipantDetails participant={participant} events={events} />}
                    </article>
                  )
                })}
              </div>
            )}
          </SectionCard>

          <p className="mt-4 text-right text-[11px] text-blue-400">
            Signed in as {user?.email ?? 'administrator'} · dataset generated {formatDateTime(dataset?.generated_at)}
          </p>
        </>
      )}
    </div>
  )
}
