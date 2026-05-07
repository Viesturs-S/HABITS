import type { HabitTrackerState } from './habitTrackerTypes'
import { parseHabitTrackerState, serializeHabitTrackerState } from './habitTrackerTypes'

const STORAGE_KEY = 'personal-habit-dashboard-v1'
const SYNC_TOKEN_KEY = 'habit-dashboard-sync-token'

export function loadHabitTrackerFromStorage(): HabitTrackerState | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseHabitTrackerState(raw)
  } catch {
    return null
  }
}

export function saveHabitTrackerToStorage(state: HabitTrackerState) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, serializeHabitTrackerState(state))
  } catch {
    // quota or private mode
  }
}

export function loadSyncToken(): string {
  if (typeof localStorage === 'undefined') return ''
  try {
    return localStorage.getItem(SYNC_TOKEN_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function saveSyncToken(token: string) {
  if (typeof localStorage === 'undefined') return
  try {
    if (token) localStorage.setItem(SYNC_TOKEN_KEY, token)
    else localStorage.removeItem(SYNC_TOKEN_KEY)
  } catch {
    //
  }
}
