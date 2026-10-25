export const MAX_DATABASE_NUMERIC = 9_999_999_999.99
export const MAX_POSTGRES_INTEGER = 2_147_483_647

const UNSAFE_TEXT_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g

export function sanitizePlainText(value: string, maxLength: number): string {
  return value
    .normalize('NFC')
    .replace(UNSAFE_TEXT_CONTROLS, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maxLength)
}

export function numericInputError(
  value: string | number,
  label: string,
  minimum: number,
  maximum: number,
  integer = false,
): string | undefined {
  if (typeof value === 'string' && !value.trim()) return `${label} is required.`
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return `${label} must be a valid number.`
  if (parsed < minimum) return `${label} must be ${minimum === 0 ? '0 or greater' : `at least ${minimum}`}.`
  if (parsed > maximum) return `${label} must be ${maximum} or less.`
  if (integer && !Number.isInteger(parsed)) return `${label} must be a whole number.`
  return undefined
}

export function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) return `+63${digits.slice(1)}`
  if (digits.startsWith('63') || trimmed.startsWith('+')) return `+${digits}`
  return digits
}
