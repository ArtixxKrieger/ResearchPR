import { supabase } from './supabaseClient'

export type UsageEventType =
  | 'signed_up'
  | 'signed_in'
  | 'page_view'
  | 'household_saved'
  | 'appliance_saved'
  | 'appliance_deleted'
  | 'report_exported'
  | 'report_printed'

let warningShown = false

function warnOnce(message: string, cause: unknown): void {
  if (warningShown) return
  warningShown = true
  console.warn(`${message} Run supabase/schema.sql to enable study tracking.`, cause)
}

export function logUsageEvent(
  userId: string | null | undefined,
  eventType: UsageEventType,
  detail: Record<string, unknown> = {},
): void {
  const client = supabase
  if (!client || !userId || !navigator.onLine) return
  void (async () => {
    try {
      const { error } = await client.from('usage_events').insert({
        user_id: userId,
        event_type: eventType,
        detail,
      })
      if (error) warnOnce('Study activity could not be recorded.', error.message)
    } catch (cause) {
      warnOnce('Study activity could not be recorded.', cause)
    }
  })()
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100
}

export interface OptimizationScenarioInput {
  proposedHours: Record<string, number>
  baselineKwh: number
  projectedKwh: number
  savedKwh: number
}

export function saveOptimizationScenario(
  userId: string,
  scenario: OptimizationScenarioInput,
): void {
  const client = supabase
  if (!client || !navigator.onLine) return
  void (async () => {
    try {
      const { error } = await client.from('optimization_scenarios').upsert({
        user_id: userId,
        proposed_hours: scenario.proposedHours,
        baseline_kwh: roundToCents(scenario.baselineKwh),
        projected_kwh: roundToCents(scenario.projectedKwh),
        saved_kwh: roundToCents(scenario.savedKwh),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (error) warnOnce('The optimization scenario could not be saved for the study.', error.message)
    } catch (cause) {
      warnOnce('The optimization scenario could not be saved for the study.', cause)
    }
  })()
}

export async function fetchIsAdmin(): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('is_admin')
  if (error) throw error
  return data === true
}

export interface AdminAccountRow {
  user_id: string
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}

export interface AdminProfileRow {
  user_id: string
  display_name: string
  phone: string
  home_address: string
  created_at: string
  updated_at: string
}

export interface AdminHouseholdRow {
  id: string
  owner_id: string
  monthly_consumption: number | string
  bill_amount: number | string
  rate: number | string
  created_at: string
  updated_at: string
}

export interface AdminApplianceRow {
  id: string
  household_id: string
  name: string
  wattage: number | string
  quantity: number | string
  hours_per_day: number | string
  days_per_month: number | string
  created_at: string
  updated_at: string
}

export interface AdminScenarioRow {
  user_id: string
  proposed_hours: Record<string, number> | null
  baseline_kwh: number | string
  projected_kwh: number | string
  saved_kwh: number | string
  created_at: string
  updated_at: string
}

export interface AdminEventSummaryRow {
  user_id: string
  event_type: string
  event_count: number | string
  last_event_at: string
}

export interface AdminEventRow {
  user_id: string
  event_type: string
  detail: Record<string, unknown> | null
  created_at: string
}

export interface AdminDataset {
  generated_at: string
  accounts: AdminAccountRow[]
  profiles: AdminProfileRow[]
  households: AdminHouseholdRow[]
  appliances: AdminApplianceRow[]
  scenarios: AdminScenarioRow[]
  events: AdminEventSummaryRow[]
  recent_events: AdminEventRow[]
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

export async function fetchAdminDataset(): Promise<AdminDataset> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('admin_research_dataset')
  if (error) throw new Error(error.message)
  if (!data || typeof data !== 'object') throw new Error('The research dataset was empty.')
  const dataset = data as Partial<AdminDataset>
  return {
    generated_at: typeof dataset.generated_at === 'string' ? dataset.generated_at : new Date().toISOString(),
    accounts: asArray<AdminAccountRow>(dataset.accounts),
    profiles: asArray<AdminProfileRow>(dataset.profiles),
    households: asArray<AdminHouseholdRow>(dataset.households),
    appliances: asArray<AdminApplianceRow>(dataset.appliances),
    scenarios: asArray<AdminScenarioRow>(dataset.scenarios),
    events: asArray<AdminEventSummaryRow>(dataset.events),
    recent_events: asArray<AdminEventRow>(dataset.recent_events),
  }
}
