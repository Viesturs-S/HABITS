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

  const cancelEdit = () => setEditingId(null)

  /** Square day cells: row height must match column width (habit label stays one row tall). */
  const cellPx = 40

  const closeDetailsMenu = (el: EventTarget | null) => {
    const d = (el as HTMLElement | null)?.closest('details')
    if (d) d.open = false
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

      {editingId ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-200/90 bg-amber-50/95 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-3">
          <span className="shrink-0 text-sm font-medium text-stone-800">Rename habit</span>
          <input
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-inner"
            maxLength={80}
            autoFocus
            aria-label="Habit name"
          />
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={commitEdit}
              className="rounded-xl bg-teal-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-900"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-stone-200 bg-white/90 p-4 shadow-sm sm:p-6">
        <HabitProgressChart
          dailyTotals={dailyTotals}
          maxHabits={state.habits.length}
          periodLabel={`${MONTH_NAMES[cursor.m]} ${cursor.y}`}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-stone-800">Month grid</h2>
        <p className="text-xs text-stone-500">
          One row per habit. Each day is a fixed square ({cellPx}×{cellPx}px); tap to mark done. Use the ⋮
          menu to rename or remove a habit.
        </p>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-stone-300 p-px shadow-sm [-webkit-overflow-scrolling:touch]">
          <div
            role="grid"
            aria-label={`Habits for ${MONTH_NAMES[cursor.m]} ${cursor.y}`}
            className="inline-grid gap-px text-sm"
            style={{
              gridTemplateColumns: `minmax(9rem, 11rem) repeat(${dayCols.length}, ${cellPx}px)`,
            }}
          >
            <div
              className="sticky left-0 z-20 flex h-10 items-center border-r border-transparent bg-stone-100 px-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500"
              style={{ width: 'auto', minHeight: cellPx, boxSizing: 'border-box' }}
            >
              Habit
            </div>
            {dayCols.map((d) => (
              <div
                key={`h-${d}`}
                className="flex h-10 items-center justify-center bg-stone-100 text-[10px] font-semibold tabular-nums text-stone-600"
                style={{ width: cellPx, minWidth: cellPx, height: cellPx, boxSizing: 'border-box' }}
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
                  <div
                    className="sticky left-0 z-10 box-border flex items-center border-r border-stone-200/80 bg-[#faf8f5]"
                    style={{
                      minHeight: cellPx,
                      height: cellPx,
                      boxSizing: 'border-box',
                    }}
                  >
                    <details className="group/menu relative flex h-full w-full min-w-0 items-stretch">
                      <summary className="flex h-full min-h-0 w-full min-w-0 cursor-pointer list-none items-center gap-1 px-2 marker:hidden [&::-webkit-details-marker]:hidden">
                        <span
                          className="min-w-0 flex-1 truncate text-left text-xs font-medium text-stone-900"
                          title={h.label}
                        >
                          {h.label}
                        </span>
                        <span
                          className="shrink-0 rounded px-1 text-sm leading-none text-stone-400 hover:bg-stone-200/50 group-open/menu:bg-stone-200/60"
                          aria-hidden
                        >
                          ⋮
                        </span>
                      </summary>
                      <div
                        className="absolute left-2 top-[calc(100%+4px)] z-30 w-36 rounded-lg border border-stone-200 bg-white py-1 text-left shadow-lg"
                        onClick={(e) => closeDetailsMenu(e.target)}
                      >
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-xs font-medium text-stone-800 hover:bg-stone-50"
                          onClick={() => {
                            startEdit(h.id, h.label)
                          }}
                        >
                          Rename…
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-xs font-medium text-red-800 hover:bg-red-50"
                          onClick={() => removeHabit(h.id)}
                        >
                          Remove habit
                        </button>
                      </div>
                    </details>
                  </div>
                  {dayCols.map((d) => {
                    const dateStr = buildDateStr(cursor.y, cursor.m, d)
                    const done = Boolean(state.completions[h.id]?.[dateStr])
                    return (
                      <div
                        key={d}
                        className="box-border bg-white"
                        style={{
                          width: cellPx,
                          minWidth: cellPx,
                          height: cellPx,
                          minHeight: cellPx,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCell(h.id, dateStr)}
                          aria-pressed={done}
                          title={`${h.label} — day ${d}${done ? ' — done' : ''}`}
                          className={[
                            'box-border flex size-full items-center justify-center',
                            'text-[11px] font-semibold transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-800',
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
