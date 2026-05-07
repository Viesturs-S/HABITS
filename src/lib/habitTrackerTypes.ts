export const HABIT_TRACKER_SCHEMA_VERSION = 1 as const

export type HabitRow = {
  id: string
  label: string
}

export type HabitTrackerState = {
  version: typeof HABIT_TRACKER_SCHEMA_VERSION
  updatedAt: string
  habits: HabitRow[]
  /** habit id -> local calendar date YYYY-MM-DD -> marked */
  completions: Record<string, Record<string, true>>
}

export function emptyHabitTrackerState(): HabitTrackerState {
  return {
    version: HABIT_TRACKER_SCHEMA_VERSION,
    updatedAt: new Date(0).toISOString(),
    habits: [],
    completions: {},
  }
}

function isHabitRow(v: unknown): v is HabitRow {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.label === 'string'
}

export function parseHabitTrackerState(raw: string): HabitTrackerState | null {
  try {
    const j = JSON.parse(raw) as unknown
    if (!j || typeof j !== 'object') return null
    const o = j as Record<string, unknown>
    if (o.version !== HABIT_TRACKER_SCHEMA_VERSION) return null
    if (typeof o.updatedAt !== 'string') return null
    if (!Array.isArray(o.habits) || !o.habits.every(isHabitRow)) return null
    if (!o.completions || typeof o.completions !== 'object') return null

    const completions: HabitTrackerState['completions'] = {}
    for (const [habitId, days] of Object.entries(o.completions as Record<string, unknown>)) {
      if (typeof habitId !== 'string' || !days || typeof days !== 'object') continue
      const inner: Record<string, true> = {}
      for (const [d, marked] of Object.entries(days as Record<string, unknown>)) {
        if (marked === true && /^\d{4}-\d{2}-\d{2}$/.test(d)) inner[d] = true
      }
      if (Object.keys(inner).length) completions[habitId] = inner
    }

    return {
      version: HABIT_TRACKER_SCHEMA_VERSION,
      updatedAt: o.updatedAt,
      habits: o.habits as HabitRow[],
      completions,
    }
  } catch {
    return null
  }
}

export function serializeHabitTrackerState(state: HabitTrackerState): string {
  return JSON.stringify(state)
}

export function stateHasPayload(state: HabitTrackerState): boolean {
  if (state.habits.length > 0) return true
  return Object.keys(state.completions).length > 0
}
