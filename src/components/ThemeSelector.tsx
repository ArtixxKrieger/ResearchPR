import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from './ThemeContext'

const options: Array<{
  value: ThemePreference
  label: string
  description: string
  icon: typeof Sun
}> = [
  { value: 'light', label: 'Light', description: 'Bright and clear', icon: Sun },
  { value: 'system', label: 'System', description: 'Follow device setting', icon: Monitor },
  { value: 'dark', label: 'Dark', description: 'Low-light appearance', icon: Moon },
]

export function ThemeSelector({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const activeOption = options.find((option) => option.value === theme) ?? options[1]
  const ActiveIcon = activeOption.icon
  const menuId = 'theme-preference-menu'

  useEffect(() => {
    if (!open) return undefined

    function closeWhenOutside(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeWhenOutside)
    return () => document.removeEventListener('pointerdown', closeWhenOutside)
  }, [open])

  function focusOption(index: number) {
    const target = (index + options.length) % options.length
    optionRefs.current[target]?.focus()
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    setOpen(true)
    const selectedIndex = options.findIndex((option) => option.value === theme)
    window.requestAnimationFrame(() => focusOption(selectedIndex))
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const focusedIndex = optionRefs.current.findIndex((option) => option === document.activeElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusOption(focusedIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusOption(focusedIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusOption(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusOption(options.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  const triggerTone = variant === 'dark'
    ? 'border-white/20 bg-white/10 text-white hover:bg-white/15 focus-visible:ring-amber-300'
    : 'border-blue-200 bg-white text-blue-900 hover:border-blue-300 hover:bg-blue-50 focus-visible:ring-blue-200'

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Color theme: ${activeOption.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={`inline-flex min-h-10 min-w-[112px] items-center justify-between gap-2.5 rounded-xl border px-3 py-2 text-[13px] font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${triggerTone}`}
      >
        <span className="inline-flex items-center gap-2.5">
          <ActiveIcon size={16} aria-hidden="true" className={variant === 'dark' ? 'text-amber-300' : 'text-blue-600'} />
          <span>{activeOption.label}</span>
        </span>
        <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Choose color theme"
          onKeyDown={handleMenuKeyDown}
          className="dark-menu absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(14rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-blue-100 bg-white p-1.5 text-blue-950 shadow-[0_16px_40px_rgba(15,23,42,0.18)] ring-1 ring-black/5"
        >
          <p className="px-2.5 pb-1.5 pt-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-400">
            Appearance
          </p>
          {options.map((option, index) => {
            const OptionIcon = option.icon
            const selected = theme === option.value
            return (
              <button
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(option.value)
                  setOpen(false)
                  triggerRef.current?.focus()
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                  selected ? 'bg-blue-50 text-blue-950' : 'text-blue-800 hover:bg-blue-50/70'
                }`}
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${selected ? 'bg-blue-950 text-amber-300' : 'bg-blue-100/70 text-blue-700'}`}>
                  <OptionIcon size={16} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] text-blue-500">{option.description}</span>
                </span>
                {selected && <Check size={16} aria-hidden="true" className="shrink-0 text-blue-700" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
