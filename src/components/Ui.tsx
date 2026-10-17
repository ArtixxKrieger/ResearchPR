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
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-500">{eyebrow}</p>
        <h1 className="text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-600">{description}</p>
      </div>
      {action}
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
    <section className={`rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/60 sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-blue-950">{title}</h2>
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
