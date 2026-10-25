import { calculateMonthlyKwh } from './calculations'
import type {
  AdminApplianceRow,
  AdminDataset,
  AdminEventSummaryRow,
  AdminHouseholdRow,
  AdminScenarioRow,
} from './research'

export type ParticipantStatus = 'complete' | 'bill-only' | 'appliance-only' | 'no-data'

export interface ParticipantAppliance {
  id: string
  name: string
  wattage: number
  quantity: number
  hoursPerDay: number
  daysPerMonth: number
  kwh: number
  cost: number | null
  sharePercent: number
  createdAt: string
  updatedAt: string
}

export interface ParticipantScenarioHour {
  name: string
  originalHours: number
  proposedHours: number
  projectedKwh: number
}

export interface ParticipantScenario {
  baselineKwh: number
  projectedKwh: number
  savedKwh: number
  savedPercent: number
  updatedAt: string
  hours: ParticipantScenarioHour[]
}

export interface ParticipantHousehold {
  id: string
  billedKwh: number
  billAmount: number
  rate: number
  effectiveRate: number | null
  createdAt: string
  updatedAt: string
}

export interface Participant {
  userId: string
  email: string
  displayName: string
  phone: string
  homeAddress: string
  signedUpAt: string | null
  lastSignInAt: string | null
  emailConfirmed: boolean
  household: ParticipantHousehold | null
  appliances: ParticipantAppliance[]
  applianceKwh: number
  applianceCost: number
  applianceCount: number
  coveragePercent: number | null
  topAppliance: ParticipantAppliance | null
  scenario: ParticipantScenario | null
  eventCounts: Record<string, number>
  eventTotal: number
  pageViews: number
  signIns: number
  lastEventAt: string | null
  lastActiveAt: string | null
  daysSinceSignup: number | null
  status: ParticipantStatus
}

export interface ResearchSummary {
  totalParticipants: number
  withHousehold: number
  withAppliances: number
  withScenario: number
  activeLast7Days: number
  newLast7Days: number
  totalAppliances: number
  totalApplianceKwh: number
  totalBilledKwh: number
  averageBill: number
  averageCoveragePercent: number | null
  averageScenarioSavedPercent: number | null
  participantsSaving: number
}

export interface ResearchView {
  participants: Participant[]
  summary: ResearchSummary
}

const DAY_MS = 86_400_000

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function safeKwh(wattage: number, quantity: number, hoursPerDay: number, daysPerMonth: number): number {
  try {
    return calculateMonthlyKwh(wattage, quantity, hoursPerDay, daysPerMonth)
  } catch {
    return 0
  }
}

function latestIso(...values: Array<string | null | undefined>): string | null {
  let latest: string | null = null
  let latestTime = Number.NEGATIVE_INFINITY
  for (const value of values) {
    if (!value) continue
    const time = Date.parse(value)
    if (!Number.isFinite(time) || time <= latestTime) continue
    latest = value
    latestTime = time
  }
  return latest
}

function isWithinDays(value: string | null, days: number, now: Date): boolean {
  if (!value) return false
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return false
  return now.getTime() - time <= days * DAY_MS
}

function buildAppliances(
  rows: AdminApplianceRow[],
  rate: number | null,
): ParticipantAppliance[] {
  const measured = rows.map((row) => {
    const wattage = toNumber(row.wattage)
    const quantity = toNumber(row.quantity)
    const hoursPerDay = toNumber(row.hours_per_day)
    const daysPerMonth = toNumber(row.days_per_month)
    const kwh = safeKwh(wattage, quantity, hoursPerDay, daysPerMonth)
    return {
      id: row.id,
      name: row.name,
      wattage,
      quantity,
      hoursPerDay,
      daysPerMonth,
      kwh,
      cost: rate === null ? null : kwh * rate,
      sharePercent: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
  const total = measured.reduce((sum, appliance) => sum + appliance.kwh, 0)
  return measured.map((appliance) => ({
    ...appliance,
    sharePercent: total > 0 ? (appliance.kwh / total) * 100 : 0,
  }))
}

function buildScenario(
  row: AdminScenarioRow,
  appliances: ParticipantAppliance[],
): ParticipantScenario {
  const baselineKwh = toNumber(row.baseline_kwh)
  const projectedKwh = toNumber(row.projected_kwh)
  const savedKwh = toNumber(row.saved_kwh)
  const proposedHours = row.proposed_hours ?? {}
  return {
    baselineKwh,
    projectedKwh,
    savedKwh,
    savedPercent: baselineKwh > 0 ? (savedKwh / baselineKwh) * 100 : 0,
    updatedAt: row.updated_at,
    hours: appliances.map((appliance) => {
      const proposed = toNumber(proposedHours[appliance.id], appliance.hoursPerDay)
      return {
        name: appliance.name,
        originalHours: appliance.hoursPerDay,
        proposedHours: proposed,
        projectedKwh: safeKwh(
          appliance.wattage,
          appliance.quantity,
          proposed,
          appliance.daysPerMonth,
        ),
      }
    }),
  }
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function buildResearchView(dataset: AdminDataset, now = new Date()): ResearchView {
  const profileByUser = new Map(dataset.profiles.map((profile) => [profile.user_id, profile]))
  const householdByOwner = new Map<string, AdminHouseholdRow>()
  for (const household of dataset.households) {
    if (household.owner_id) householdByOwner.set(household.owner_id, household)
  }
  const appliancesByHousehold = new Map<string, AdminApplianceRow[]>()
  for (const appliance of dataset.appliances) {
    const list = appliancesByHousehold.get(appliance.household_id) ?? []
    list.push(appliance)
    appliancesByHousehold.set(appliance.household_id, list)
  }
  const scenarioByUser = new Map(dataset.scenarios.map((scenario) => [scenario.user_id, scenario]))
  const eventsByUser = new Map<string, AdminEventSummaryRow[]>()
  for (const event of dataset.events) {
    const list = eventsByUser.get(event.user_id) ?? []
    list.push(event)
    eventsByUser.set(event.user_id, list)
  }

  const participants: Participant[] = dataset.accounts.map((account) => {
    const profile = profileByUser.get(account.user_id)
    const householdRow = householdByOwner.get(account.user_id)
    const household: ParticipantHousehold | null = householdRow
      ? {
          id: householdRow.id,
          billedKwh: toNumber(householdRow.monthly_consumption),
          billAmount: toNumber(householdRow.bill_amount),
          rate: toNumber(householdRow.rate),
          effectiveRate: toNumber(householdRow.monthly_consumption) > 0
            ? toNumber(householdRow.bill_amount) / toNumber(householdRow.monthly_consumption)
            : null,
          createdAt: householdRow.created_at,
          updatedAt: householdRow.updated_at,
        }
      : null
    const appliances = buildAppliances(
      householdRow ? appliancesByHousehold.get(householdRow.id) ?? [] : [],
      household?.rate ?? null,
    )
    const applianceKwh = appliances.reduce((sum, appliance) => sum + appliance.kwh, 0)
    const sorted = [...appliances].sort((left, right) => right.kwh - left.kwh)
    const scenarioRow = scenarioByUser.get(account.user_id)
    const eventRows = eventsByUser.get(account.user_id) ?? []
    const eventCounts: Record<string, number> = {}
    let eventTotal = 0
    let lastEventAt: string | null = null
    for (const event of eventRows) {
      const count = toNumber(event.event_count)
      eventCounts[event.event_type] = (eventCounts[event.event_type] ?? 0) + count
      eventTotal += count
      lastEventAt = latestIso(lastEventAt, event.last_event_at)
    }
    const lastActiveAt = latestIso(
      account.last_sign_in_at,
      lastEventAt,
      household?.updatedAt,
      ...appliances.map((appliance) => appliance.updatedAt),
      scenarioRow?.updated_at,
      profile?.updated_at,
    )
    const email = account.email ?? ''
    const signedUpAt = account.created_at

    return {
      userId: account.user_id,
      email,
      displayName: profile?.display_name?.trim() || email.split('@')[0] || 'Unnamed participant',
      phone: profile?.phone ?? '',
      homeAddress: profile?.home_address ?? '',
      signedUpAt,
      lastSignInAt: account.last_sign_in_at,
      emailConfirmed: Boolean(account.email_confirmed_at),
      household,
      appliances,
      applianceKwh,
      applianceCost: household ? applianceKwh * household.rate : 0,
      applianceCount: appliances.length,
      coveragePercent: household && household.billedKwh > 0
        ? (applianceKwh / household.billedKwh) * 100
        : null,
      topAppliance: sorted[0] ?? null,
      scenario: scenarioRow ? buildScenario(scenarioRow, appliances) : null,
      eventCounts,
      eventTotal,
      pageViews: eventCounts.page_view ?? 0,
      signIns: eventCounts.signed_in ?? 0,
      lastEventAt,
      lastActiveAt,
      daysSinceSignup: signedUpAt && Number.isFinite(Date.parse(signedUpAt))
        ? Math.max(0, Math.floor((now.getTime() - Date.parse(signedUpAt)) / DAY_MS))
        : null,
      status: household
        ? appliances.length > 0 ? 'complete' : 'bill-only'
        : appliances.length > 0 ? 'appliance-only' : 'no-data',
    }
  })

  participants.sort((left, right) => {
    const leftTime = left.lastActiveAt ? Date.parse(left.lastActiveAt) : 0
    const rightTime = right.lastActiveAt ? Date.parse(right.lastActiveAt) : 0
    if (rightTime !== leftTime) return rightTime - leftTime
    return left.displayName.localeCompare(right.displayName)
  })

  const households = participants.filter((participant) => participant.household)
  const withAppliances = participants.filter((participant) => participant.applianceCount > 0)
  const scenarios = participants.filter((participant) => participant.scenario)

  return {
    participants,
    summary: {
      totalParticipants: participants.length,
      withHousehold: households.length,
      withAppliances: withAppliances.length,
      withScenario: scenarios.length,
      activeLast7Days: participants.filter((participant) => isWithinDays(participant.lastActiveAt, 7, now)).length,
      newLast7Days: participants.filter((participant) => isWithinDays(participant.signedUpAt, 7, now)).length,
      totalAppliances: participants.reduce((sum, participant) => sum + participant.applianceCount, 0),
      totalApplianceKwh: participants.reduce((sum, participant) => sum + participant.applianceKwh, 0),
      totalBilledKwh: households.reduce((sum, participant) => sum + (participant.household?.billedKwh ?? 0), 0),
      averageBill: average(households.map((participant) => participant.household?.billAmount ?? 0)) ?? 0,
      averageCoveragePercent: average(
        participants
          .map((participant) => participant.coveragePercent)
          .filter((value): value is number => value !== null),
      ),
      averageScenarioSavedPercent: average(
        scenarios.map((participant) => participant.scenario?.savedPercent ?? 0),
      ),
      participantsSaving: scenarios.filter((participant) => (participant.scenario?.savedKwh ?? 0) > 0.01).length,
    },
  }
}
