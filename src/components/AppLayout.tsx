import { NavLink, Outlet } from 'react-router-dom'
import { Activity, BarChart3, Bolt, ClipboardList, House, LogOut, X } from 'lucide-react'
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
  const { user, error, dismissError, signOut } = useEnergy()
  const [signOutError, setSignOutError] = useState<string | null>(null)

  async function handleSignOut() {
    setSignOutError(null)
    try {
      await signOut()
    } catch (cause) {
      setSignOutError(cause instanceof Error ? cause.message : 'Could not sign out.')
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
