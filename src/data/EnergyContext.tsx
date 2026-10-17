import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, supabaseConfigError } from '../lib/supabaseClient'
import type { Appliance, ApplianceInput, Household } from '../types'

interface HouseholdRow {
  id: string
  monthly_consumption: number | string
  bill_amount: number | string
  rate: number | string
}

interface ApplianceRow {
  id: string
  household_id: string
  name: string
  wattage: number | string
  quantity: number | string
  hours_per_day: number | string
  days_per_month: number | string
}

interface EnergyContextValue {
  user: User | null
  authLoading: boolean
  household: Household | null
  appliances: Appliance[]
  proposedHours: Record<string, number>
  setProposedHours: Dispatch<SetStateAction<Record<string, number>>>
  resetProposedHours: () => void
  loading: boolean
  error: string | null
  saveHousehold: (values: Omit<Household, 'id'>) => Promise<void>
  saveAppliance: (values: ApplianceInput, id?: string) => Promise<void>
  deleteAppliance: (id: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  dismissError: () => void
}

const EnergyContext = createContext<EnergyContextValue | null>(null)

function mapHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    monthlyConsumption: Number(row.monthly_consumption),
    billAmount: Number(row.bill_amount),
    rate: Number(row.rate),
  }
}

function mapAppliance(row: ApplianceRow): Appliance {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    wattage: Number(row.wattage),
    quantity: Number(row.quantity),
    hoursPerDay: Number(row.hours_per_day),
    daysPerMonth: Number(row.days_per_month),
  }
}

export function EnergyProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [household, setHousehold] = useState<Household | null>(null)
  const [appliances, setAppliances] = useState<Appliance[]>([])
  const [proposedHours, setProposedHours] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(supabaseConfigError)
  const authEventReceived = useRef(false)

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      setLoading(false)
      return undefined
    }
    let mounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived.current = true
      if (!mounted) return
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted || authEventReceived.current) return
      if (sessionError) {
        setError(sessionError.message)
      } else {
        setUser(data.session?.user ?? null)
      }
      setAuthLoading(false)
    }).catch((cause: unknown) => {
      if (!mounted || authEventReceived.current) return
      setError(cause instanceof Error ? cause.message : 'Could not restore your sign-in session.')
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    const client = supabase
    const authenticatedUser = user
    if (!client || !authenticatedUser) {
      setHousehold(null)
      setAppliances([])
      setProposedHours({})
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setHousehold(null)
    setAppliances([])
    setProposedHours({})
    setError(null)

    async function loadUserData(authorizedClient: NonNullable<typeof supabase>, ownerId: string) {
      try {
        const { data: householdRow, error: householdError } = await authorizedClient
          .from('households')
          .select('id, monthly_consumption, bill_amount, rate')
          .eq('owner_id', ownerId)
          .maybeSingle()
        if (householdError) throw householdError
        if (!householdRow) {
          if (active) setHousehold(null)
          return
        }
        const selectedHousehold = mapHousehold(householdRow as HouseholdRow)
        const { data: applianceRows, error: applianceError } = await authorizedClient
          .from('appliances')
          .select('id, household_id, name, wattage, quantity, hours_per_day, days_per_month')
          .eq('household_id', selectedHousehold.id)
          .order('created_at', { ascending: true })
        if (applianceError) throw applianceError
        if (active) {
          setHousehold(selectedHousehold)
          setAppliances(((applianceRows ?? []) as ApplianceRow[]).map(mapAppliance))
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load saved energy data.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadUserData(client, authenticatedUser.id)
    return () => {
      active = false
    }
  }, [authLoading, user])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) throw authError
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
    const { data, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) throw authError
    return !data.session
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
    const { error: authError } = await supabase.auth.signOut()
    if (authError) throw authError
  }, [])

  const saveHousehold = useCallback(async (values: Omit<Household, 'id'>) => {
    if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
    if (!user) throw new Error('Sign in before saving household information.')
    const payload = {
      owner_id: user.id,
      monthly_consumption: values.monthlyConsumption,
      bill_amount: values.billAmount,
      rate: values.rate,
    }
    const { data, error: saveError } = await supabase.from('households')
      .upsert(payload, { onConflict: 'owner_id' })
      .select('id, monthly_consumption, bill_amount, rate')
      .single()
    if (saveError) throw saveError
    setHousehold(mapHousehold(data as HouseholdRow))
  }, [user])

  const saveAppliance = useCallback(async (values: ApplianceInput, id?: string) => {
    if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
    if (!household) throw new Error('Save actual billed information before adding appliances.')
    const payload = {
      household_id: household.id,
      name: values.name.trim(),
      wattage: values.wattage,
      quantity: values.quantity,
      hours_per_day: values.hoursPerDay,
      days_per_month: values.daysPerMonth,
    }
    const query = id
      ? supabase.from('appliances').update(payload).eq('id', id)
      : supabase.from('appliances').insert(payload)
    const { data, error: saveError } = await query
      .select('id, household_id, name, wattage, quantity, hours_per_day, days_per_month')
      .single()
    if (saveError) throw saveError
    const saved = mapAppliance(data as ApplianceRow)
    setAppliances((current) =>
      id ? current.map((appliance) => (appliance.id === id ? saved : appliance)) : [...current, saved],
    )
  }, [household])

  const deleteAppliance = useCallback(async (id: string) => {
    if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
    const { error: deleteError } = await supabase.from('appliances').delete().eq('id', id)
    if (deleteError) throw deleteError
    setAppliances((current) => current.filter((appliance) => appliance.id !== id))
  }, [])

  const value = useMemo<EnergyContextValue>(() => ({
    user,
    authLoading,
    household,
    appliances,
    proposedHours,
    setProposedHours,
    resetProposedHours: () => setProposedHours({}),
    loading,
    error,
    saveHousehold,
    saveAppliance,
    deleteAppliance,
    signIn,
    signUp,
    signOut,
    dismissError: () => setError(null),
  }), [user, authLoading, household, appliances, proposedHours, loading, error, saveHousehold, saveAppliance, deleteAppliance, signIn, signUp, signOut])

  return <EnergyContext.Provider value={value}>{children}</EnergyContext.Provider>
}

export function useEnergy(): EnergyContextValue {
  const context = useContext(EnergyContext)
  if (!context) throw new Error('useEnergy must be used within EnergyProvider.')
  return context
}
