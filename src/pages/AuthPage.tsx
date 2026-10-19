import { useState, type FormEvent } from 'react'
import { ArrowRight, Bolt, LockKeyhole, Mail } from 'lucide-react'
import { supabaseConfigError } from '../lib/supabaseClient'
import { useEnergy } from '../data/EnergyContext'
import { ThemeSelector } from '../components/ThemeSelector'

export function AuthPage() {
  const { signIn, signUp, error: sessionError } = useEnergy()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setEmailError(null)
    setPasswordError(null)
    setMessage(null)
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setEmailError('Email address is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'sign-in') {
        await signIn(normalizedEmail, password)
      } else {
        const needsEmailConfirmation = await signUp(normalizedEmail, password)
        if (needsEmailConfirmation) {
          setError('Supabase is still requiring email confirmation. Disable Confirm email in the Supabase Auth settings, then create the account again.')
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const displayedError = error ?? sessionError

  return (
    <main className="auth-screen relative grid min-h-screen bg-blue-50 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="auth-story relative hidden min-h-screen flex-col justify-between overflow-hidden bg-blue-950 p-10 text-white lg:flex xl:p-16">
        <div className="pointer-events-none absolute -right-44 top-1/4 size-136 rounded-full border border-amber-300/15 shadow-[0_0_0_4rem_rgba(252,211,77,0.025),0_0_0_8rem_rgba(252,211,77,0.02)]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-300 text-blue-950"><Bolt size={25} fill="currentColor" /></span>
            <div>
              <p className="font-bold tracking-tight">Pagsibol <span className="font-normal text-blue-200">/ energy study</span></p>
              <p className="text-[10px] tracking-[0.18em] text-blue-300">NAIC, CAVITE</p>
            </div>
          </div>
        </div>
        <div className="relative my-12 max-w-xl">
          <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">A clearer picture of home energy</p>
          <h1 className="font-serif text-5xl font-medium leading-[1.08] tracking-tight xl:text-6xl">
            See where the<br />kilowatts <span className="text-amber-300">go.</span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-blue-200">
            Bring your electricity bill and everyday appliance use into one simple place. Explore practical changes with estimates you can understand.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3 border-t border-white/15 pt-5">
            {[
              ['01', 'Record', 'Your bill'],
              ['02', 'Map', 'Your appliances'],
              ['03', 'Explore', 'A new plan'],
            ].map(([number, title, detail]) => (
              <div key={number}>
                <p className="text-[10px] font-bold tracking-widest text-amber-300">{number}</p>
                <p className="mt-2 text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-[11px] text-blue-300">{detail}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-[10px] uppercase tracking-[0.18em] text-blue-400">Household energy research · Pagsibol 4A</p>
      </section>

      <section className="grid min-h-screen place-items-center px-5 py-16 sm:px-8 lg:px-10">
        <div className="fixed right-5 top-5 z-10">
          <ThemeSelector />
        </div>
        <div className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_24px_80px_rgba(24,53,96,0.12)] sm:p-9">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-300 text-blue-950"><Bolt size={25} fill="currentColor" /></span>
            <div>
              <p className="font-bold text-blue-950">Pagsibol <span className="font-normal text-blue-500">/ energy study</span></p>
              <p className="text-[10px] tracking-[0.16em] text-blue-400">NAIC, CAVITE</p>
            </div>
          </div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Your household workspace</p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-blue-950">
            {mode === 'sign-in' ? 'Welcome back.' : 'Start your account.'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-blue-600">
            {mode === 'sign-in' ? 'Sign in to pick up where your household energy story left off.' : 'Create an account to save your household energy details.'}
          </p>
          {supabaseConfigError && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{supabaseConfigError}</p>
          )}
          {displayedError && <p role="alert" className="mt-4 text-sm text-rose-700">{displayedError}</p>}
          {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            <label htmlFor="auth-email" className="block">
              <span className="mb-1.5 block text-xs font-semibold text-blue-800">Email address</span>
              <span className="relative block">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <input id="auth-email" type="email" autoComplete="email" required aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'auth-email-error' : undefined} value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(null) }} placeholder="you@example.com" className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-sm text-blue-950 outline-none focus:ring-4 focus:ring-blue-100 ${emailError ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-blue-200 focus:border-blue-500'}`} />
              </span>
              {emailError && <span id="auth-email-error" role="alert" className="mt-1 block text-xs text-rose-600">{emailError}</span>}
            </label>
            <label htmlFor="auth-password" className="block">
              <span className="mb-1.5 block text-xs font-semibold text-blue-800">Password</span>
              <span className="relative block">
                <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <input id="auth-password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required minLength={8} aria-invalid={Boolean(passwordError)} aria-describedby={passwordError ? 'auth-password-error' : undefined} value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(null) }} placeholder="At least 8 characters" className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-sm text-blue-950 outline-none focus:ring-4 focus:ring-blue-100 ${passwordError ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-blue-200 focus:border-blue-500'}`} />
              </span>
              {passwordError && <span id="auth-password-error" role="alert" className="mt-1 block text-xs text-rose-600">{passwordError}</span>}
            </label>
            <button type="submit" disabled={submitting || Boolean(supabaseConfigError)} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
              {!submitting && <ArrowRight size={15} className="text-amber-300 transition-transform group-hover:translate-x-1" />}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-blue-600">
            {mode === 'sign-in' ? 'No account?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
                setError(null)
                setEmailError(null)
                setPasswordError(null)
                setMessage(null)
              }}
              className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
            >
              {mode === 'sign-in' ? 'Create account' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
