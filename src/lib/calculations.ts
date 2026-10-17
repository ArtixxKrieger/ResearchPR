import type { Appliance, ApplianceProjection } from '../types'

export function calculateMonthlyKwh(
  wattage: number,
  quantity: number,
  hoursPerDay: number,
  daysPerMonth: number,
): number {
  return (wattage * quantity * hoursPerDay * daysPerMonth) / 1000
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
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatPeso(value: number): string {
  return `₱${new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}
