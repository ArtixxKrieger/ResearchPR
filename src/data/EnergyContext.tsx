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
import {
  readOfflineSnapshot,
  writeOfflineSnapshot,
  type OfflineConflict,
  type OfflineMutation,
  type OfflineSnapshot,
} from './offlineStore'

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
  online: boolean
  pendingSyncCount: number
  conflicts: OfflineConflict[]
  saveHousehold: (values: Omit<Household, 'id'>) => Promise<void>
  saveAppliance: (values: ApplianceInput, id?: string) => Promise<void>
  deleteAppliance: (id: string) => Promise<void>
  syncOfflineChanges: () => Promise<void>
  resolveOfflineConflict: (id: string, choice: 'local' | 'remote') => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  dismissError: () => void
}

const EnergyContext = createContext<EnergyContextValue | null>(null)

const emptySnapshot = (): OfflineSnapshot => ({
  household: null,
  appliances: [],
  mutations: [],
  conflicts: [],
})

function sameData(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function isNetworkFailure(cause: unknown): boolean {
  if (!navigator.onLine) return true
  if (cause instanceof TypeError) return /fetch|network|load failed/i.test(cause.message)
  if (typeof cause === 'object' && cause !== null && 'status' in cause) {
    return (cause as { status?: unknown }).status === 0
  }
  return false
}

function queueMutation(
  snapshot: OfflineSnapshot,
  mutation: OfflineMutation,
): OfflineSnapshot {
  const previous = snapshot.mutations.find((item) =>
    item.entity === mutation.entity && item.entityId === mutation.entityId,
  )
  const base = previous ? previous.base : mutation.base
  const mutations = snapshot.mutations.filter((item) =>
    item.entity !== mutation.entity || item.entityId !== mutation.entityId,
  )
  const conflicts = snapshot.conflicts.filter((item) =>
    item.entity !== mutation.entity || item.entityId !== mutation.entityId,
  )
  if (base === null && mutation.action === 'delete') {
    return mutation.entity === 'household'
      ? { ...snapshot, household: null, mutations, conflicts }
      : {
          ...snapshot,
          appliances: snapshot.appliances.filter((item) => item.id !== mutation.entityId),
          mutations,
          conflicts,
        }
  }
  return { ...snapshot, mutations: [...mutations, { ...mutation, base }], conflicts }
}

function applyLocalMutations(snapshot: OfflineSnapshot): OfflineSnapshot {
  let household = snapshot.household
  let appliances = [...snapshot.appliances]
  const changes = [...snapshot.mutations, ...snapshot.conflicts]
  for (const change of changes) {
    if (change.entity === 'household') {
      household = change.action === 'delete' ? null : change.local as Household
      continue
    }
    appliances = appliances.filter((item) => item.id !== change.entityId)
    if (change.action !== 'delete' && change.local) appliances.push(change.local as Appliance)
  }
  return { ...snapshot, household, appliances }
}

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

async function loadRemoteSnapshot(
  client: NonNullable<typeof supabase>,
  ownerId: string,
): Promise<OfflineSnapshot> {
  const { data: householdRow, error: householdError } = await client
    .from('households')
    .select('id, monthly_consumption, bill_amount, rate')
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (householdError) throw householdError
  if (!householdRow) return emptySnapshot()

  const selectedHousehold = mapHousehold(householdRow as HouseholdRow)
  const { data: applianceRows, error: applianceError } = await client
    .from('appliances')
    .select('id, household_id, name, wattage, quantity, hours_per_day, days_per_month')
    .eq('household_id', selectedHousehold.id)
    .order('created_at', { ascending: true })
  if (applianceError) throw applianceError
  return {
    household: selectedHousehold,
    appliances: ((applianceRows ?? []) as ApplianceRow[]).map(mapAppliance),
    mutations: [],
    conflicts: [],
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
  const [online, setOnline] = useState(navigator.onLine)
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflineSnapshot>(emptySnapshot)
  const offlineSnapshotRef = useRef<OfflineSnapshot>(emptySnapshot())
  const syncPromiseRef = useRef<Promise<void> | null>(null)
  const authEventReceived = useRef(false)
  const activeUserIdRef = useRef<string | null>(null)

  const persistSnapshot = useCallback(async (ownerId: string, snapshot: OfflineSnapshot) => {
    await writeOfflineSnapshot(ownerId, snapshot)
    if (activeUserIdRef.current !== ownerId) return
    offlineSnapshotRef.current = snapshot
    setOfflineSnapshot(snapshot)
    setHousehold(snapshot.household)
    setAppliances(snapshot.appliances)
  }, [])

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  useEffect(() => {
    if (!user || !navigator.onLine || !import.meta.env.PROD || !('serviceWorker' in navigator)) return
    void navigator.serviceWorker.ready.then(() => Promise.all([
      import('../pages/Dashboard'),
      import('../pages/Optimization'),
      import('../pages/Reports'),
    ])).catch((cause: unknown) => {
      console.error('Could not prepare all study pages for offline use.', cause)
    })
  }, [user])

  const syncOfflineChanges = useCallback(async () => {
    const client = supabase
    const ownerId = user?.id
    if (syncPromiseRef.current) return syncPromiseRef.current
    if (!client || !ownerId || !navigator.onLine) return
    let finishSync!: () => void
    const syncPromise = new Promise<void>((resolve) => { finishSync = resolve })
    syncPromiseRef.current = syncPromise

    try {
      let snapshot = offlineSnapshotRef.current
      const ordered = [...snapshot.mutations].sort((left, right) =>
        left.entity === right.entity ? 0 : left.entity === 'household' ? -1 : 1,
      )
      let mutations = [...snapshot.mutations]
      let conflicts = [...snapshot.conflicts]
      for (const mutation of ordered) {
        if (conflicts.some((item) => item.id === mutation.id)) continue
        try {
          let remote: Household | Appliance | null
          if (mutation.entity === 'household') {
            const { data, error: fetchError } = await client.from('households')
              .select('id, monthly_consumption, bill_amount, rate')
              .eq('owner_id', ownerId)
              .maybeSingle()
            if (fetchError) throw fetchError
            remote = data ? mapHousehold(data as HouseholdRow) : null
          } else {
            const { data, error: fetchError } = await client.from('appliances')
              .select('id, household_id, name, wattage, quantity, hours_per_day, days_per_month')
              .eq('id', mutation.entityId)
              .maybeSingle()
            if (fetchError) throw fetchError
            remote = data ? mapAppliance(data as ApplianceRow) : null
          }

          const alreadyApplied = mutation.action === 'delete'
            ? remote === null
            : remote !== null && sameData(remote, mutation.local)
          if (alreadyApplied) {
            mutations = mutations.filter((item) => item.id !== mutation.id)
            continue
          }
          const baseStillCurrent = mutation.base === null
            ? remote === null
            : remote !== null && sameData(remote, mutation.base)
          if (!baseStillCurrent) {
            conflicts.push({ ...mutation, remote })
            continue
          }

          if (mutation.action === 'delete') {
            if (mutation.entity === 'appliance') {
              const { error: deleteError } = await client.from('appliances').delete().eq('id', mutation.entityId)
              if (deleteError) throw deleteError
            } else {
              const { error: deleteError } = await client.from('households').delete().eq('owner_id', ownerId)
              if (deleteError) throw deleteError
            }
          } else if (mutation.entity === 'household') {
            const householdValue = mutation.local as Household
            const { error: saveError } = await client.from('households').upsert({
              id: householdValue.id,
              owner_id: ownerId,
              monthly_consumption: householdValue.monthlyConsumption,
              bill_amount: householdValue.billAmount,
              rate: householdValue.rate,
            }, { onConflict: 'owner_id' })
            if (saveError) throw saveError
          } else {
            const applianceValue = mutation.local as Appliance
            const { error: saveError } = await client.from('appliances').upsert({
              id: applianceValue.id,
              household_id: applianceValue.householdId,
              name: applianceValue.name,
              wattage: applianceValue.wattage,
              quantity: applianceValue.quantity,
              hours_per_day: applianceValue.hoursPerDay,
              days_per_month: applianceValue.daysPerMonth,
            }, { onConflict: 'id' })
            if (saveError) throw saveError
          }
          mutations = mutations.filter((item) => item.id !== mutation.id)
        } catch (cause) {
          snapshot = { ...snapshot, mutations, conflicts }
          await persistSnapshot(ownerId, applyLocalMutations(snapshot))
          if (isNetworkFailure(cause)) return
          setError(cause instanceof Error ? `Could not sync offline changes: ${cause.message}` : 'Could not sync offline changes.')
          return
        }
      }

      try {
        const remote = await loadRemoteSnapshot(client, ownerId)
        conflicts = conflicts.map((conflict) => ({
          ...conflict,
          remote: conflict.entity === 'household'
            ? remote.household
            : remote.appliances.find((item) => item.id === conflict.entityId) ?? null,
        }))
        snapshot = applyLocalMutations({ ...remote, mutations, conflicts })
        await persistSnapshot(ownerId, snapshot)
        setError(null)
      } catch (cause) {
        if (!isNetworkFailure(cause)) {
          setError(cause instanceof Error ? `Could not refresh after syncing: ${cause.message}` : 'Could not refresh after syncing.')
        }
      }
    } catch (cause) {
      setError(cause instanceof Error
        ? `Could not preserve offline changes: ${cause.message}`
        : 'Could not preserve offline changes.')
    } finally {
      syncPromiseRef.current = null
      finishSync()
    }
  }, [persistSnapshot, user])

  const resolveOfflineConflict = useCallback(async (id: string, choice: 'local' | 'remote') => {
    if (!user) throw new Error('Sign in to resolve offline changes.')
    const snapshot = offlineSnapshotRef.current
    const conflict = snapshot.conflicts.find((item) => item.id === id)
    if (!conflict) return

    let updated: OfflineSnapshot
    if (choice === 'local') {
      const updatedConflict = { ...conflict, base: conflict.remote }
      updated = {
        ...snapshot,
        mutations: [
          ...snapshot.mutations.filter((item) => item.id !== id),
          updatedConflict,
        ],
        conflicts: snapshot.conflicts.filter((item) => item.id !== id),
      }
    } else {
      const remainingMutations = snapshot.mutations.filter((item) => item.id !== id)
      const remainingConflicts = snapshot.conflicts.filter((item) => item.id !== id)
      let base = { ...snapshot, mutations: remainingMutations, conflicts: remainingConflicts }
      if (conflict.entity === 'household') {
        base = { ...base, household: conflict.remote as Household | null }
      } else {
        const appliances = base.appliances.filter((item) => item.id !== conflict.entityId)
        if (conflict.remote) appliances.push(conflict.remote as Appliance)
        base = { ...base, appliances }
      }
      updated = base
    }
    await persistSnapshot(user.id, updated)
    if (choice === 'local' && navigator.onLine) {
      void syncOfflineChanges().catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not sync the selected version.')
      })
    }
  }, [persistSnapshot, syncOfflineChanges, user])

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      setLoading(false)
      return undefined
    }
    let mounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived.current = true
      activeUserIdRef.current = session?.user.id ?? null
      if (!mounted) return
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted || authEventReceived.current) return
      if (sessionError) {
        setError(sessionError.message)
      } else {
        activeUserIdRef.current = data.session?.user.id ?? null
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
      offlineSnapshotRef.current = emptySnapshot()
      setOfflineSnapshot(emptySnapshot())
      setProposedHours({})
      setLoading(false)
      return
    }
    const authorizedClient = client

    let active = true
    setLoading(true)
    setHousehold(null)
    setAppliances([])
    setProposedHours({})
    setError(null)

    async function loadUserData(ownerId: string) {
      try {
        const cached = await readOfflineSnapshot(ownerId)
        if (!active) return
        const initial = cached ?? emptySnapshot()
        offlineSnapshotRef.current = initial
        setOfflineSnapshot(initial)
        setHousehold(initial.household)
        setAppliances(initial.appliances)
        if (!navigator.onLine) {
          if (!cached) setError('No saved offline household data is available on this device yet.')
          return
        }
        const remote = await loadRemoteSnapshot(authorizedClient, ownerId)
        if (!active) return
        const pending = offlineSnapshotRef.current
        const conflicts = pending.conflicts.map((conflict) => ({
          ...conflict,
          remote: conflict.entity === 'household'
            ? remote.household
            : remote.appliances.find((item) => item.id === conflict.entityId) ?? null,
        }))
        const merged = applyLocalMutations({
          ...remote,
          mutations: pending.mutations,
          conflicts,
        })
        await persistSnapshot(ownerId, merged)
      } catch (cause) {
        if (active) {
          const cached = offlineSnapshotRef.current
          setHousehold(cached.household)
          setAppliances(cached.appliances)
          if (navigator.onLine) {
            setError(cause instanceof Error
              ? `Could not refresh saved data. Showing this device's copy: ${cause.message}`
              : 'Could not refresh saved data. Showing this device’s cached copy.')
          } else if (!cached.household && cached.appliances.length === 0) {
            setError('No saved offline household data is available on this device yet.')
          }
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadUserData(authenticatedUser.id)
    return () => {
      active = false
    }
  }, [authLoading, persistSnapshot, syncOfflineChanges, user])

  useEffect(() => {
    const hasSyncableChanges = offlineSnapshot.mutations.some((mutation) =>
      !offlineSnapshot.conflicts.some((conflict) => conflict.id === mutation.id),
    )
    if (online && user && !loading && hasSyncableChanges) {
      void syncOfflineChanges()
    }
  }, [loading, offlineSnapshot.mutations.length, online, syncOfflineChanges, user])

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
    if (syncPromiseRef.current) await syncPromiseRef.current
    const previous = offlineSnapshotRef.current
    if (previous.conflicts.some((item) => item.entity === 'household')) {
      throw new Error('Resolve the pending household conflict before making another change.')
    }
    const local: Household = { id: previous.household?.id ?? crypto.randomUUID(), ...values }
    const householdAlreadyQueued = previous.mutations.some((item) => item.entity === 'household')
    if (navigator.onLine && !householdAlreadyQueued) {
      try {
        const { data, error: saveError } = await supabase.from('households')
          .upsert({
            id: local.id,
            owner_id: user.id,
            monthly_consumption: values.monthlyConsumption,
            bill_amount: values.billAmount,
            rate: values.rate,
          }, { onConflict: 'owner_id' })
          .select('id, monthly_consumption, bill_amount, rate')
          .single()
        if (saveError) throw saveError
        await persistSnapshot(user.id, { ...previous, household: mapHousehold(data as HouseholdRow) })
        return
      } catch (cause) {
        if (!isNetworkFailure(cause)) throw cause
      }
    }
    const mutation: OfflineMutation = {
      id: crypto.randomUUID(),
      entity: 'household',
      entityId: local.id,
      action: 'save',
      base: previous.household,
      local,
    }
    await persistSnapshot(user.id, applyLocalMutations(queueMutation(previous, mutation)))
  }, [persistSnapshot, user])

  const saveAppliance = useCallback(async (values: ApplianceInput, id?: string) => {
    if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
    if (!user) throw new Error('Sign in before saving appliances.')
    if (!household) throw new Error('Save actual billed information before adding appliances.')
    if (syncPromiseRef.current) await syncPromiseRef.current
    const previous = offlineSnapshotRef.current
    if (id && previous.conflicts.some((item) => item.entity === 'appliance' && item.entityId === id)) {
      throw new Error('Resolve this appliance conflict before making another change.')
    }
    const existing = id ? previous.appliances.find((item) => item.id === id) : undefined
    const local: Appliance = {
      id: id ?? crypto.randomUUID(),
      householdId: household.id,
      name: values.name.trim(),
      wattage: values.wattage,
      quantity: values.quantity,
      hoursPerDay: values.hoursPerDay,
      daysPerMonth: values.daysPerMonth,
    }
    const applianceAlreadyQueued = previous.mutations.some((item) =>
      item.entity === 'appliance' && item.entityId === local.id,
    )
    if (navigator.onLine && !applianceAlreadyQueued) {
      try {
        const payload = {
          id: local.id,
          household_id: local.householdId,
          name: local.name,
          wattage: local.wattage,
          quantity: local.quantity,
          hours_per_day: local.hoursPerDay,
          days_per_month: local.daysPerMonth,
        }
        const query = id
          ? supabase.from('appliances').update(payload).eq('id', id)
          : supabase.from('appliances').insert(payload)
        const { data, error: saveError } = await query
          .select('id, household_id, name, wattage, quantity, hours_per_day, days_per_month')
          .single()
        if (saveError) throw saveError
        const saved = mapAppliance(data as ApplianceRow)
        const appliances = id
          ? previous.appliances.map((item) => item.id === id ? saved : item)
          : [...previous.appliances, saved]
        await persistSnapshot(user.id, { ...previous, appliances })
        return
      } catch (cause) {
        if (!isNetworkFailure(cause)) throw cause
      }
    }
    const mutation: OfflineMutation = {
      id: crypto.randomUUID(),
      entity: 'appliance',
      entityId: local.id,
      action: 'save',
      base: existing ?? null,
      local,
    }
    await persistSnapshot(user.id, applyLocalMutations(queueMutation(previous, mutation)))
  }, [household, persistSnapshot, user])

  const deleteAppliance = useCallback(async (id: string) => {
    if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
    if (!user) throw new Error('Sign in before deleting appliances.')
    if (syncPromiseRef.current) await syncPromiseRef.current
    const previous = offlineSnapshotRef.current
    if (previous.conflicts.some((item) => item.entity === 'appliance' && item.entityId === id)) {
      throw new Error('Resolve this appliance conflict before deleting it.')
    }
    const existing = previous.appliances.find((item) => item.id === id)
    if (!existing) throw new Error('This appliance is no longer available on this device.')
    const applianceAlreadyQueued = previous.mutations.some((item) =>
      item.entity === 'appliance' && item.entityId === id,
    )
    if (navigator.onLine && !applianceAlreadyQueued) {
      try {
        const { error: deleteError } = await supabase.from('appliances').delete().eq('id', id)
        if (deleteError) throw deleteError
        await persistSnapshot(user.id, {
          ...previous,
          appliances: previous.appliances.filter((item) => item.id !== id),
        })
        return
      } catch (cause) {
        if (!isNetworkFailure(cause)) throw cause
      }
    }
    const mutation: OfflineMutation = {
      id: crypto.randomUUID(),
      entity: 'appliance',
      entityId: id,
      action: 'delete',
      base: existing,
      local: null,
    }
    await persistSnapshot(user.id, applyLocalMutations(queueMutation(previous, mutation)))
  }, [persistSnapshot, user])

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
    online,
    pendingSyncCount: offlineSnapshot.mutations.length,
    conflicts: offlineSnapshot.conflicts,
    saveHousehold,
    saveAppliance,
    deleteAppliance,
    syncOfflineChanges,
    resolveOfflineConflict,
    signIn,
    signUp,
    signOut,
    dismissError: () => setError(null),
  }), [user, authLoading, household, appliances, proposedHours, loading, error, online, offlineSnapshot.mutations.length, offlineSnapshot.conflicts, saveHousehold, saveAppliance, deleteAppliance, syncOfflineChanges, resolveOfflineConflict, signIn, signUp, signOut])

  return <EnergyContext.Provider value={value}>{children}</EnergyContext.Provider>
}

export function useEnergy(): EnergyContextValue {
  const context = useContext(EnergyContext)
  if (!context) throw new Error('useEnergy must be used within EnergyProvider.')
  return context
}
