import type { InputHTMLAttributes, ReactNode } from 'react'

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex min-w-0 flex-col justify-between gap-4 sm:mb-7 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">
          <span className="h-px w-5 bg-amber-400" />{eyebrow}
        </p>
        <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-blue-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-600">{description}</p>
      </div>
      {action && <div className="min-w-0 w-full sm:w-auto">{action}</div>}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  children,
  className = '',
  action,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-blue-100/80 bg-white p-4 shadow-[0_8px_30px_rgba(33,73,126,0.045)] sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-blue-50 pb-4">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-semibold text-blue-950">{title}</h2>
          {description && <p className="mt-1 text-sm text-blue-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Field({
  label,
  error,
  hint,
  id,
  className = '',
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}) {
  return (
    <label className={`block ${className}`} htmlFor={id}>
      <span className="mb-1.5 block text-xs font-semibold text-blue-800">{label}</span>
      <input
        id={id}
        {...inputProps}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-blue-950 outline-none transition placeholder:text-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
          error ? 'border-rose-300' : 'border-blue-200'
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {error ? (
        <span id={`${id}-error`} className="mt-1 block text-xs text-rose-600">{error}</span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1 block text-xs text-blue-400">{hint}</span>
      ) : null}
    </label>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-5 py-8 text-center text-sm leading-6 text-blue-500">
      {children}
    </div>
  )
}

export function LoadingState() {
  return (
    <div role="status" className="rounded-2xl border border-blue-100 bg-white px-6 py-12 text-center text-sm text-blue-500">
      Loading saved energy data…
    </div>
  )
}
