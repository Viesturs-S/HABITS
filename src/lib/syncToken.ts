/** Token shipped in the client bundle (set in Vercel for Production builds). Must match server `HABIT_SYNC_SECRET`. */
export function getBuiltInSyncToken(): string {
  return import.meta.env.VITE_HABIT_SYNC_SECRET?.trim() ?? ''
}

export function getEffectiveSyncToken(stored: string): string {
  return getBuiltInSyncToken() || stored.trim()
}
