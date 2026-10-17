import { NavLink, Outlet } from 'react-router-dom'
import { Activity, BarChart3, Bolt, ClipboardList, House, LogOut, X } from 'lucide-react'
import { useState } from 'react'
import { useEnergy } from '../data/EnergyContext'
import { ThemeSelector } from './ThemeSelector'

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
    <div className="min-h-screen bg-blue-50 text-blue-950">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-4 lg:px-8">
          <NavLink to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-700 text-white">
              <Bolt size={23} fill="currentColor" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight text-blue-950 sm:text-base">
                Pagsibol Energy Optimizer
              </span>
              <span className="block truncate text-xs text-blue-500">
                Energy research · Naic, Cavite
              </span>
            </span>
          </NavLink>
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <div className="hidden min-w-0 max-w-48 truncate text-right sm:block">
              <p className="text-xs font-semibold text-blue-800">{user?.email}</p>
            </div>
            <ThemeSelector />
            <button type="button" onClick={() => void handleSignOut()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:gap-7 sm:px-5 sm:py-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-9">
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-400 sm:mb-3 sm:px-3">
            Workspace
          </p>
          <nav className="grid grid-cols-3 gap-2 lg:flex lg:flex-col">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-2.5 text-center text-[11px] font-semibold leading-tight transition sm:flex-row sm:gap-3 sm:px-3.5 sm:py-3 sm:text-sm lg:justify-start lg:text-left ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-sm shadow-blue-200'
                      : 'text-blue-700 hover:bg-white'
                  }`
                }
              >
                <Icon className="shrink-0" size={18} />
                <span className="min-w-0">{label}</span>
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

        <main className="min-w-0">
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
    </div>
  )
}
