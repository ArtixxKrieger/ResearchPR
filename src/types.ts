export interface Household {
  id: string
  monthlyConsumption: number
  billAmount: number
  rate: number
}

export interface Appliance {
  id: string
  householdId: string
  name: string
  wattage: number
  quantity: number
  hoursPerDay: number
  daysPerMonth: number
}

export interface ApplianceInput {
  name: string
  wattage: number
  quantity: number
  hoursPerDay: number
  daysPerMonth: number
}

export interface ApplianceProjection extends Appliance {
  originalKwh: number
  projectedHoursPerDay: number
  projectedKwh: number
}
