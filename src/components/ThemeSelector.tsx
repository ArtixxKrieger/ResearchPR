import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from './ThemeContext'

const options: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const Icon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon

  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-2.5 py-2 text-xs font-semibold text-blue-700">
      <Icon size={15} aria-hidden="true" />
      <span className="sr-only">Color theme</span>
      <select
        aria-label="Color theme"
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemePreference)}
        className="cursor-pointer border-0 bg-transparent text-xs font-semibold text-blue-800 outline-none"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
