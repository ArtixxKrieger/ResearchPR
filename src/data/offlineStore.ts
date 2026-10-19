import type { Appliance, Household } from '../types'

export interface OfflineMutation {
  id: string
  entity: 'household' | 'appliance'
  entityId: string
  action: 'save' | 'delete'
  base: Household | Appliance | null
  local: Household | Appliance | null
}

export interface OfflineConflict extends OfflineMutation {
  remote: Household | Appliance | null
}

export interface OfflineSnapshot {
  household: Household | null
  appliances: Appliance[]
  mutations: OfflineMutation[]
  conflicts: OfflineConflict[]
}

const DATABASE_NAME = 'pagsibol-offline'
const DATABASE_VERSION = 1
const STORE_NAME = 'accounts'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'userId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open offline data storage.'))
    request.onblocked = () => reject(new Error('Offline storage is blocked by another open app tab.'))
  })
}

export async function readOfflineSnapshot(userId: string): Promise<OfflineSnapshot | null> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(userId)
      request.onsuccess = () => {
        const result = request.result as (OfflineSnapshot & { userId: string }) | undefined
        resolve(result ? {
          household: result.household,
          appliances: result.appliances,
          mutations: result.mutations,
          conflicts: result.conflicts,
        } : null)
      }
      request.onerror = () => reject(request.error ?? new Error('Could not read offline energy data.'))
    })
  } finally {
    database.close()
  }
}

export async function writeOfflineSnapshot(userId: string, snapshot: OfflineSnapshot): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put({ ...snapshot, userId })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save offline energy data.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Offline data save was interrupted.'))
    })
  } finally {
    database.close()
  }
}
