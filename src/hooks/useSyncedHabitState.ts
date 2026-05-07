import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRemoteHabits, pushRemoteHabits } from '../lib/habitsSyncApi'
import {
  loadHabitTrackerFromStorage,
  loadSyncToken,
  saveHabitTrackerToStorage,
  saveSyncToken,
} from '../lib/habitTrackerStorage'
import {
  emptyHabitTrackerState,
  parseHabitTrackerState,
  serializeHabitTrackerState,
  stateHasPayload,
  type HabitTrackerState,
} from '../lib/habitTrackerTypes'

function bumpUpdatedAt(state: HabitTrackerState): HabitTrackerState {
  return { ...state, updatedAt: new Date().toISOString() }
}

function readInitialState(): HabitTrackerState {
  return loadHabitTrackerFromStorage() ?? emptyHabitTrackerState()
}

function pickNewer(a: HabitTrackerState, b: HabitTrackerState): HabitTrackerState {
  const ta = Date.parse(a.updatedAt) || 0
  const tb = Date.parse(b.updatedAt) || 0
  return ta >= tb ? a : b
}

export function useSyncedHabitState() {
  const [syncToken, setSyncTokenState] = useState(loadSyncToken)
  const [state, setStateInternal] = useState(readInitialState)
  const [syncHint, setSyncHint] = useState<string | null>(null)
  const remoteReadyRef = useRef(false)
  const remoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setSyncToken = useCallback((token: string) => {
    const t = token.trim()
    saveSyncToken(t)
    setSyncTokenState(t)
    setSyncHint(null)
  }, [])

  const setState = useCallback((updater: (prev: HabitTrackerState) => HabitTrackerState) => {
    setStateInternal((prev) => bumpUpdatedAt(updater(prev)))
  }, [])

  useEffect(() => {
    saveHabitTrackerToStorage(state)
  }, [state])

  const pullRemote = useCallback(async () => {
    const token = syncToken.trim()
    if (!token) return
    remoteReadyRef.current = false
    setSyncHint('Syncing…')
    try {
      const remoteRaw = await fetchRemoteHabits(token)
      setStateInternal((prev) => {
        if (!remoteRaw || remoteRaw.trim() === '') {
          if (stateHasPayload(prev)) {
            void pushRemoteHabits(token, serializeHabitTrackerState(prev)).catch(() => {})
          }
          return prev
        }
        const remote = parseHabitTrackerState(remoteRaw)
        if (!remote) return prev
        return pickNewer(remote, prev)
      })
      setSyncHint(`Synced ${new Date().toLocaleTimeString()}`)
    } catch (e) {
      setSyncHint(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      remoteReadyRef.current = true
    }
  }, [syncToken])

  useEffect(() => {
    if (!syncToken.trim()) {
      remoteReadyRef.current = false
      return
    }
    const schedule = window.setTimeout(() => {
      void pullRemote()
    }, 0)
    return () => window.clearTimeout(schedule)
  }, [syncToken, pullRemote])

  useEffect(() => {
    const token = syncToken.trim()
    if (!token || !remoteReadyRef.current) return

    if (remoteTimer.current) clearTimeout(remoteTimer.current)
    remoteTimer.current = setTimeout(() => {
      void pushRemoteHabits(token, serializeHabitTrackerState(state)).catch((e) => {
        setSyncHint(e instanceof Error ? e.message : 'Could not upload changes')
      })
    }, 900)

    return () => {
      if (remoteTimer.current) clearTimeout(remoteTimer.current)
    }
  }, [state, syncToken])

  return {
    state,
    setState,
    syncToken,
    setSyncToken,
    syncHint: syncToken.trim() ? syncHint : null,
    pullRemote,
  }
}
