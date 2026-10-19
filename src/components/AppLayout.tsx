import { NavLink, Outlet } from 'react-router-dom'
import { Activity, BarChart3, Bolt, Check, ClipboardList, Cloud, CloudOff, House, LogOut, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { useEnergy } from '../data/EnergyContext'
import { ThemeSelector } from './ThemeSelector'
import { PwaInstallButton } from './PwaInstallButton'

const navigation = [
  { to: '/', label: 'Dashboard', icon: House, end: true },
  { to: '/optimization', label: 'Optimization', icon: Activity, end: false },
  { to: '/reports', label: 'Results & Reports', icon: BarChart3, end: false },
]

export function AppLayout() {
  const {
    user,
    error,
    dismissError,
    signOut,
    online,
    pendingSyncCount,
    conflicts,
    syncOfflineChanges,
    resolveOfflineConflict,
  } = useEnergy()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function handleSignOut() {
    setSignOutError(null)
    if (pendingSyncCount > 0 || conflicts.length > 0) {
      setSignOutError('Sync or resolve your offline changes before signing out.')
      return
    }
    try {
      await signOut()
    } catch (cause) {
      setSignOutError(cause instanceof Error ? cause.message : 'Could not sign out.')
    }
  }

  async function handleSync() {
    setSyncError(null)
    try {
      await syncOfflineChanges()
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : 'Could not sync offline changes.')
    }
  }

  return (
    <div className="app-shell min-h-screen bg-blue-50 text-blue-950">
      <header className="border-b border-blue-950 bg-blue-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-4 lg:px-8">
          <NavLink to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-300 text-blue-950 shadow-[0_0_24px_rgba(252,211,77,0.18)]">
              <Bolt size={23} fill="currentColor" strokeWidth={2.5} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight text-white sm:text-base">
                Pagsibol <span className="font-normal text-blue-200">/ energy study</span>
              </span>
              <span className="block truncate text-[11px] tracking-wide text-blue-300">
                HOUSEHOLD ENERGY · NAIC, CAVITE
              </span>
            </span>
          </NavLink>
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <div className="hidden min-w-0 max-w-48 truncate text-right sm:block">
              <p className="text-xs font-semibold text-blue-200">{user?.email}</p>
            </div>
            <ThemeSelector variant="dark" />
            <PwaInstallButton dark />
            <button type="button" onClick={() => void handleSignOut()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 pb-24 sm:gap-7 sm:px-5 sm:py-7 sm:pb-28 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-9">
        <aside className="hidden lg:sticky lg:top-6 lg:block lg:h-fit">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
            Your workspace
          </p>
          <nav className="flex flex-col gap-1.5">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-w-0 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-blue-950 text-white shadow-sm shadow-blue-200'
                      : 'text-blue-700 hover:bg-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="shrink-0" size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span className="min-w-0 flex-1">{label}</span>
                    {isActive && <span className="size-1.5 rounded-full bg-amber-300" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="mt-8 hidden rounded-2xl border border-blue-100 bg-white p-4 lg:block">
            <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ClipboardList size={18} />
            </div>
            <p className="text-xs font-bold text-blue-900">About this study</p>
            <p className="mt-1.5 text-xs leading-5 text-blue-500">
              Transparent appliance calculations for household energy planning.
            </p>
          </div>
        </aside>

        <main className="page-enter min-w-0">
          {signOutError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{signOutError}</div>}
          {(!online || pendingSyncCount > 0) && (
            <section
              aria-label="Offline data and sync status"
              className={`mb-5 rounded-2xl border px-4 py-3 ${
                online
                  ? 'border-amber-200 bg-amber-50 text-amber-950'
                  : 'border-blue-200 bg-white text-blue-950'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  {online
                    ? <Cloud size={18} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                    : <CloudOff size={18} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" />}
                  <div>
                    <p className="text-sm font-semibold">
                      {!online
                        ? 'You are offline. Changes are saved on this device.'
                        : pendingSyncCount > 0
                          ? `${pendingSyncCount} change${pendingSyncCount === 1 ? '' : 's'} waiting to sync.`
                          : 'Back online.'}
                    </p>
                    <p className="mt-1 text-xs leading-5 opacity-80">
                      Offline data is stored in this browser and is not encrypted by the app. Avoid using a shared device.
                    </p>
                  </div>
                </div>
                {online && pendingSyncCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleSync()}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100"
                  >
                    <RefreshCw size={14} aria-hidden="true" /> Sync now
                  </button>
                )}
              </div>
              {syncError && <p role="alert" className="mt-2 text-xs text-rose-700">{syncError}</p>}
            </section>
          )}
          {conflicts.length > 0 && (
            <section aria-label="Offline sync conflicts" className="mb-5 rounded-2xl border border-rose-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700">
                  <CloudOff size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-blue-950">Choose which version to keep</h2>
                  <p className="mt-1 text-xs leading-5 text-blue-600">
                    This data changed on another connection while your device was offline. Review both versions before syncing.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {conflicts.map((conflict) => {
                  const label = conflict.entity === 'household'
                    ? 'Actual billed information'
                    : (conflict.local as { name?: string } | null)?.name
                      ?? (conflict.remote as { name?: string } | null)?.name
                      ?? 'Appliance'
                  const describe = (value: typeof conflict.local) => {
                    if (!value) return 'Deleted'
                    if (conflict.entity === 'household') {
                      const household = value as { monthlyConsumption: number; billAmount: number; rate: number }
                      return `${household.monthlyConsumption} kWh · ₱${household.billAmount} bill · ₱${household.rate}/kWh`
                    }
                    const appliance = value as { wattage: number; quantity: number; hoursPerDay: number; daysPerMonth: number }
                    return `${appliance.wattage} W · quantity ${appliance.quantity} · ${appliance.hoursPerDay} h/day · ${appliance.daysPerMonth} days/month`
                  }
                  return (
                    <article key={conflict.id} className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                      <h3 className="text-xs font-bold text-blue-950">{label}</h3>
                      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                        <p className="rounded-lg bg-white p-2 text-blue-700">
                          <strong className="block text-[10px] uppercase tracking-wide text-blue-400">This device</strong>
                          {describe(conflict.local)}
                        </p>
                        <p className="rounded-lg bg-white p-2 text-blue-700">
                          <strong className="block text-[10px] uppercase tracking-wide text-blue-400">Online version</strong>
                          {describe(conflict.remote)}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void resolveOfflineConflict(conflict.id, 'local').catch((cause: unknown) => {
                            setSyncError(cause instanceof Error ? cause.message : 'Could not keep this device’s version.')
                          })}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-950 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                        >
                          <Check size={13} aria-hidden="true" /> Keep this device
                        </button>
                        <button
                          type="button"
                          onClick={() => void resolveOfflineConflict(conflict.id, 'remote').catch((cause: unknown) => {
                            setSyncError(cause instanceof Error ? cause.message : 'Could not use the online version.')
                          })}
                          className="inline-flex min-h-9 items-center rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50"
                        >
                          Use online version
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}
          {error && (
            <div role="alert" className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <span><strong className="font-semibold">Data service:</strong> {error}</span>
              <button type="button" onClick={dismissError} aria-label="Dismiss error" className="shrink-0 rounded p-0.5 hover:bg-rose-100">
                <X size={17} />
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      <nav aria-label="Main navigation" className="mobile-dock fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-blue-100 bg-white/95 px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(15,40,75,0.08)] backdrop-blur lg:hidden">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight transition ${
                isActive ? 'text-blue-950' : 'text-blue-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`grid size-8 place-items-center rounded-xl ${isActive ? 'bg-amber-300 text-blue-950' : ''}`}>
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                </span>
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
