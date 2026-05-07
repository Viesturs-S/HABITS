import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { HabitProgressChart } from './components/HabitProgressChart'
import { useSyncedHabitState } from './hooks/useSyncedHabitState'
import type { HabitTrackerState } from './lib/habitTrackerTypes'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function buildDateStr(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function HabitDashboard({
  state,
  setState,
  syncBar,
}: {
  state: HabitTrackerState
  setState: (fn: (prev: HabitTrackerState) => HabitTrackerState) => void
  syncBar: ReactNode
}) {
  const today = new Date()
  const [cursor, setCursor] = useState(() => ({
    y: today.getFullYear(),
    m: today.getMonth(),
  }))
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const dayCols = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  )

  const dailyTotals = useMemo(() => {
    return dayCols.map((d) => {
      const dateStr = buildDateStr(cursor.y, cursor.m, d)
      return state.habits.filter((h) => state.completions[h.id]?.[dateStr]).length
    })
  }, [cursor.m, cursor.y, dayCols, state.completions, state.habits])

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const t = new Date(c.y, c.m + delta, 1)
      return { y: t.getFullYear(), m: t.getMonth() }
    })
  }

  const toggleCell = (habitId: string, dateStr: string) => {
    setState((s) => {
      const completions = { ...s.completions }
      const inner = { ...(completions[habitId] ?? {}) }
      if (inner[dateStr]) delete inner[dateStr]
      else inner[dateStr] = true
      if (Object.keys(inner).length) completions[habitId] = inner
      else delete completions[habitId]
      return { ...s, completions }
    })
  }

  const addHabit = () => {
    const label = newLabel.trim()
    if (!label) return
    const id = crypto.randomUUID()
    setState((s) => ({
      ...s,
      habits: [...s.habits, { id, label: label.slice(0, 80) }],
    }))
    setNewLabel('')
  }

  const removeHabit = (habitId: string) => {
    if (!confirm('Remove this habit and its marks for all dates?')) return
    setState((s) => {
      const completions = { ...s.completions }
      delete completions[habitId]
      return { ...s, habits: s.habits.filter((h) => h.id !== habitId), completions }
    })
  }

  const startEdit = (id: string, label: string) => {
    setEditingId(id)
    setEditDraft(label)
  }

  const commitEdit = () => {
    if (!editingId) return
    const label = editDraft.trim()
    if (!label) return
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => (h.id === editingId ? { ...h, label: label.slice(0, 80) } : h)),
    }))
    setEditingId(null)
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-stone-900 sm:text-2xl">Habit dashboard</h1>
        <p className="text-sm text-stone-600">
          Month at a glance: tap the chart for context, then fill the grid. The graph tracks how many
          habits you finished each day.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-xl border border-stone-200 bg-white/80 px-3 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-white"
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="min-w-[10rem] text-center text-sm font-semibold text-stone-800">
          {MONTH_NAMES[cursor.m]} {cursor.y}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-xl border border-stone-200 bg-white/80 px-3 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-white"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white/90 p-4 shadow-sm sm:p-6">
        <HabitProgressChart dailyTotals={dailyTotals} maxHabits={state.habits.length} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-stone-800">Month grid</h2>
        <p className="text-xs text-stone-500">
          One row per habit, one square per day. Tap a square to mark it — layout is a single heatmap-style
          grid (not a list of checkbox rows).
        </p>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-stone-300 p-px shadow-sm [-webkit-overflow-scrolling:touch]">
          <div
            role="grid"
            aria-label={`Habits for ${MONTH_NAMES[cursor.m]} ${cursor.y}`}
            className="inline-grid gap-px text-sm"
            style={{
              gridTemplateColumns: `minmax(7.5rem, 11rem) repeat(${dayCols.length}, minmax(1.75rem, 2rem))`,
            }}
          >
            <div className="sticky left-0 z-20 bg-stone-100 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500 sm:min-w-[9rem]">
              Habit
            </div>
            {dayCols.map((d) => (
              <div
                key={`h-${d}`}
                className="bg-stone-100 py-2 text-center text-[10px] font-semibold tabular-nums text-stone-600"
              >
                {d}
              </div>
            ))}

            {state.habits.length === 0 ? (
              <div
                className="bg-white px-4 py-10 text-center text-sm text-stone-500"
                style={{ gridColumn: '1 / -1' }}
              >
                Add a habit below to start your grid.
              </div>
            ) : (
              state.habits.map((h) => (
                <Fragment key={h.id}>
                  <div className="sticky left-0 z-10 min-w-0 bg-[#faf8f5] px-2 py-1.5 sm:min-w-[9rem]">
                    {editingId === h.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="w-full rounded border border-stone-200 px-1.5 py-1 text-xs text-stone-900"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={commitEdit}
                            className="rounded bg-teal-800 px-2 py-0.5 text-[10px] text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded border border-stone-200 px-2 py-0.5 text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span
                          className="block truncate text-xs font-medium text-stone-900 sm:text-sm"
                          title={h.label}
                        >
                          {h.label}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0">
                          <button
                            type="button"
                            onClick={() => startEdit(h.id, h.label)}
                            className="text-[10px] font-medium text-teal-900 underline decoration-teal-900/25"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => removeHabit(h.id)}
                            className="text-[10px] font-medium text-stone-500 underline decoration-stone-400/40"
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {dayCols.map((d) => {
                    const dateStr = buildDateStr(cursor.y, cursor.m, d)
                    const done = Boolean(state.completions[h.id]?.[dateStr])
                    return (
                      <div key={d} className="min-h-8 bg-white">
                        <button
                          type="button"
                          onClick={() => toggleCell(h.id, dateStr)}
                          aria-pressed={done}
                          title={`${h.label} — day ${d}${done ? ' — done' : ''}`}
                          className={[
                            'flex h-full min-h-8 w-full items-center justify-center',
                            'text-[10px] font-semibold transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-800',
                            done ? 'bg-teal-600 text-white' : 'bg-white hover:bg-stone-100',
                          ].join(' ')}
                        >
                          {done ? '✓' : null}
                        </button>
                      </div>
                    )
                  })}
                </Fragment>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {syncBar}

        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm sm:p-5">
          <label htmlFor="new-habit" className="text-sm font-medium text-stone-800">
            New habit
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="new-habit"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHabit()}
              placeholder="e.g. Meditate, Read, Walk"
              className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-900 shadow-inner placeholder:text-stone-400"
              maxLength={80}
            />
            <button
              type="button"
              onClick={addHabit}
              className="rounded-xl bg-teal-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-900"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SyncBar(props: {
  canSync: boolean
  syncNow: () => Promise<void>
  syncHint: string | null
  showManualTokenHint: boolean
  setSyncToken: (t: string) => void
}) {
  const { canSync, syncNow, syncHint, showManualTokenHint, setSyncToken } = props
  const [busy, setBusy] = useState(false)
  const [manualDraft, setManualDraft] = useState('')

  const onSync = () => {
    if (!canSync || busy) return
    setBusy(true)
    void syncNow().finally(() => setBusy(false))
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/90 p-3 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-900">Devices</p>
        <p className="mt-1 text-sm text-stone-600">
          {canSync
            ? 'Tap Sync to merge with your other devices and save the latest habits to the cloud.'
            : 'One-tap sync needs Vercel env vars (see below). Your data still saves in this browser.'}
        </p>
        {syncHint ? (
          <p className="mt-2 text-xs text-stone-600" role="status">
            {syncHint}
          </p>
        ) : null}
        {showManualTokenHint ? (
          <details className="mt-3 text-xs text-stone-500">
            <summary className="cursor-pointer font-medium text-stone-700">Manual token (optional)</summary>
            <p className="mt-2 leading-relaxed">
              If you don’t add <code className="rounded bg-stone-100 px-1">VITE_HABIT_SYNC_SECRET</code> to Vercel
              for builds, paste the same value as server <code className="rounded bg-stone-100 px-1">HABIT_SYNC_SECRET</code>{' '}
              here once per browser.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="password"
                autoComplete="off"
                value={manualDraft}
                onChange={(e) => setManualDraft(e.target.value)}
                placeholder="HABIT_SYNC_SECRET"
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900"
              />
              <button
                type="button"
                onClick={() => {
                  setSyncToken(manualDraft)
                  setManualDraft('')
                }}
                className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
            </div>
          </details>
        ) : null}
      </div>
      <button
        type="button"
        disabled={!canSync || busy}
        onClick={onSync}
        className="mt-3 shrink-0 rounded-xl bg-teal-800 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0"
      >
        {busy ? 'Syncing…' : 'Sync'}
      </button>
    </div>
  )
}

export default function App() {
  const { state, setState, syncHint, syncNow, canSync, showManualTokenHint, setSyncToken } =
    useSyncedHabitState()

  const syncBar = (
    <SyncBar
      canSync={canSync}
      syncNow={syncNow}
      syncHint={syncHint}
      showManualTokenHint={showManualTokenHint}
      setSyncToken={setSyncToken}
    />
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/90 via-stone-100 to-[#ebe4d8]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <HabitDashboard state={state} setState={setState} syncBar={syncBar} />
        <p className="mt-6 text-center text-[11px] text-stone-400">
          Local copy in this browser. Add <code className="rounded bg-stone-200/60 px-1">VITE_HABIT_SYNC_SECRET</code>{' '}
          (same as <code className="rounded bg-stone-200/60 px-1">HABIT_SYNC_SECRET</code>) in Vercel for Production
          builds, plus Upstash Redis, to enable Sync without pasting secrets.
        </p>
      </div>
    </div>
  )
}
