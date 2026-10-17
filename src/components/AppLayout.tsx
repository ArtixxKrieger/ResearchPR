import { NavLink, Outlet } from 'react-router-dom'
import { Activity, BarChart3, Bolt, ClipboardList, House, LogOut, X } from 'lucide-react'
import { useState } from 'react'
import { useEnergy } from '../data/EnergyContext'

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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
          <NavLink to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-700 text-white">
              <Bolt size={23} fill="currentColor" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight text-blue-950 sm:text-base">
                Pagsibol Energy Optimizer
              </span>
              <span className="block truncate text-xs text-blue-500">
                Research prototype · Naic, Cavite
              </span>
            </span>
          </NavLink>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-blue-800">{user?.email}</p>
              <p className="text-[11px] text-blue-400">Rule-based projections</p>
            </div>
            <button type="button" onClick={() => void handleSignOut()} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-7 px-5 py-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-9">
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-400">
            Workspace
          </p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-sm shadow-blue-200'
                      : 'text-blue-700 hover:bg-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
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
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            <strong>Account privacy:</strong> Household records are protected by Supabase Row Level Security and are visible only to the signed-in account, provided the ownership policies in <code>supabase/schema.sql</code> have been applied.
          </div>
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
