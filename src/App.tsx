import { useMemo, useState } from 'react'
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
}: {
  state: HabitTrackerState
  setState: (fn: (prev: HabitTrackerState) => HabitTrackerState) => void
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
          Personal grid tracker: habits on the side, days across the top. The graph shows how many
          habits you completed each day.
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

      <div className="overflow-x-auto rounded-3xl border border-stone-200 bg-white/90 shadow-sm">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-[520px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-stone-200 bg-[#faf8f5] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Habit
                </th>
                {dayCols.map((d) => (
                  <th
                    key={d}
                    className="border-b border-stone-200 px-0.5 py-2 text-center text-[10px] font-semibold text-stone-500 sm:text-xs"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.habits.length === 0 ? (
                <tr>
                  <td
                    colSpan={dayCols.length + 1}
                    className="px-4 py-10 text-center text-sm text-stone-500"
                  >
                    Add a habit below to start your grid.
                  </td>
                </tr>
              ) : (
                state.habits.map((h) => (
                  <tr key={h.id} className="border-b border-stone-100 last:border-0">
                    <td className="sticky left-0 z-10 max-w-[10rem] border-r border-stone-200 bg-[#faf8f5] px-2 py-1 align-middle">
                      {editingId === h.id ? (
                        <div className="flex flex-col gap-1">
                          <input
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit()
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="w-full rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-900"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={commitEdit}
                              className="rounded-md bg-teal-800 px-2 py-0.5 text-[11px] text-white"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-md border border-stone-200 px-2 py-0.5 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="truncate font-medium text-stone-900" title={h.label}>
                            {h.label}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(h.id, h.label)}
                              className="text-[11px] font-medium text-teal-900 underline decoration-teal-900/25"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => removeHabit(h.id)}
                              className="text-[11px] font-medium text-stone-500 underline decoration-stone-400/40"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    {dayCols.map((d) => {
                      const dateStr = buildDateStr(cursor.y, cursor.m, d)
                      const done = Boolean(state.completions[h.id]?.[dateStr])
                      return (
                        <td key={d} className="px-0.5 py-0.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCell(h.id, dateStr)}
                            aria-pressed={done}
                            className={[
                              'mx-auto flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold transition sm:h-8 sm:w-8',
                              done
                                ? 'border-teal-700 bg-teal-600 text-white shadow-sm'
                                : 'border-stone-200 bg-stone-50 text-stone-300 hover:border-amber-300/80 hover:bg-amber-50/50',
                            ].join(' ')}
                          >
                            {done ? '✓' : ''}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white/90 p-4 shadow-sm sm:p-5">
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
  )
}

function SyncPanel(props: {
  syncToken: string
  setSyncToken: (t: string) => void
  syncHint: string | null
  pullRemote: () => Promise<void>
}) {
  const { syncToken, setSyncToken, syncHint, pullRemote } = props
  const [draft, setDraft] = useState(syncToken)

  return (
    <div className="mt-10 rounded-3xl border border-stone-200 bg-white/90 p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-stone-900">Cloud sync (optional)</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Use the same secret on every device. Set <code className="rounded bg-stone-100 px-1">HABIT_SYNC_SECRET</code>{' '}
        in your Vercel project (match this value), add Upstash Redis via Vercel Storage, redeploy, then paste the
        secret here.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm text-stone-700">
          <span className="mb-1 block font-medium">Sync token</span>
          <input
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Same value as HABIT_SYNC_SECRET"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-900"
          />
        </label>
        <button
          type="button"
          onClick={() => setSyncToken(draft)}
          className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900"
        >
          Save token
        </button>
        <button
          type="button"
          onClick={() => void pullRemote()}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
        >
          Pull now
        </button>
      </div>
      {syncHint ? (
        <p className="mt-3 text-xs text-stone-600" role="status">
          {syncHint}
        </p>
      ) : null}
    </div>
  )
}

export default function App() {
  const { state, setState, syncToken, setSyncToken, syncHint, pullRemote } = useSyncedHabitState()

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/90 via-stone-100 to-[#ebe4d8]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <HabitDashboard state={state} setState={setState} />
        <SyncPanel
          syncToken={syncToken}
          setSyncToken={setSyncToken}
          syncHint={syncHint}
          pullRemote={pullRemote}
        />
        <p className="mt-6 text-center text-[11px] text-stone-400">
          Local copy in this browser (localStorage). With a token, changes also sync to your Vercel API + Redis.
        </p>
      </div>
    </div>
  )
}
