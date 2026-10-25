import type { Appliance, ApplianceProjection } from '../types'
import { MAX_DATABASE_NUMERIC, MAX_POSTGRES_INTEGER } from './inputValidation'

export function calculateMonthlyKwh(
  wattage: number,
  quantity: number,
  hoursPerDay: number,
  daysPerMonth: number,
): number {
  if (!Number.isFinite(wattage) || wattage <= 0 || wattage > MAX_DATABASE_NUMERIC) {
    throw new RangeError('Wattage must be a finite value greater than 0 within the supported limit.')
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_POSTGRES_INTEGER) {
    throw new RangeError('Quantity must be a whole number within the supported limit.')
  }
  if (!Number.isFinite(hoursPerDay) || hoursPerDay < 0 || hoursPerDay > 24) {
    throw new RangeError('Hours per day must be between 0 and 24.')
  }
  if (!Number.isInteger(daysPerMonth) || daysPerMonth < 0 || daysPerMonth > 31) {
    throw new RangeError('Days per month must be a whole number from 0 to 31.')
  }
  const result = (wattage * quantity * hoursPerDay * daysPerMonth) / 1000
  if (!Number.isFinite(result)) throw new RangeError('The calculated energy use is outside the supported range.')
  return result
}

export function calculateApplianceKwh(appliance: Appliance): number {
  return calculateMonthlyKwh(
    appliance.wattage,
    appliance.quantity,
    appliance.hoursPerDay,
    appliance.daysPerMonth,
  )
}

export function rankAppliances(appliances: Appliance[]): ApplianceProjection[] {
  return appliances
    .map((appliance) => {
      const originalKwh = calculateApplianceKwh(appliance)
      return {
        ...appliance,
        originalKwh,
        projectedHoursPerDay: appliance.hoursPerDay,
        projectedKwh: originalKwh,
      }
    })
    .sort((a, b) => b.originalKwh - a.originalKwh)
}

export function formatNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) throw new RangeError('Cannot format a non-finite number.')
  if (!Number.isInteger(digits) || digits < 0 || digits > 20) {
    throw new RangeError('Fraction digits must be a whole number between 0 and 20.')
  }
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatPeso(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError('Cannot format a non-finite peso amount.')
  return `₱${new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}
