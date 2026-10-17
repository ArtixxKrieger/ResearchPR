import { useState, type FormEvent } from 'react'
import { Bolt, LockKeyhole, Mail } from 'lucide-react'
import { supabaseConfigError } from '../lib/supabaseClient'
import { useEnergy } from '../data/EnergyContext'

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
          setMessage('Account created. Check your email to confirm your account, then sign in.')
          setMode('sign-in')
          setPassword('')
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-blue-50 px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/70 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-700 text-white"><Bolt size={25} fill="currentColor" /></span>
          <div>
            <p className="font-bold text-blue-950">Pagsibol Energy Optimizer</p>
            <p className="text-xs text-blue-500">Household energy research</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-blue-950">
          {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-blue-600">
          Sign in to save and view your household energy data.
        </p>
        {supabaseConfigError && (
          <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{supabaseConfigError}</p>
        )}
        {(error || sessionError) && <p role="alert" className="mt-4 text-sm text-rose-700">{error ?? sessionError}</p>}
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
          <button type="submit" disabled={submitting || Boolean(supabaseConfigError)} className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
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
      </section>
    </main>
  )
}
