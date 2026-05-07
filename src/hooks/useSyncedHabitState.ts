import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchRemoteHabits, pushRemoteHabits } from '../lib/habitsSyncApi'
import { getBuiltInSyncToken, getEffectiveSyncToken } from '../lib/syncToken'
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

function mergePull(prev: HabitTrackerState, remoteRaw: string): HabitTrackerState {
  if (!remoteRaw || !remoteRaw.trim()) {
    return prev
  }
  const remote = parseHabitTrackerState(remoteRaw)
  if (!remote) return prev
  return pickNewer(remote, prev)
}

export function useSyncedHabitState() {
  const [storedSyncToken, setStoredSyncToken] = useState(loadSyncToken)
  const [state, setStateInternal] = useState(readInitialState)
  const [syncHint, setSyncHint] = useState<string | null>(null)
  const remoteReadyRef = useRef(false)
  const remoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)

  const effectiveToken = useMemo(
    () => getEffectiveSyncToken(storedSyncToken),
    [storedSyncToken],
  )

  const hasBuiltInToken = useMemo(() => Boolean(getBuiltInSyncToken()), [])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const setSyncToken = useCallback((token: string) => {
    const t = token.trim()
    saveSyncToken(t)
    setStoredSyncToken(t)
    setSyncHint(null)
  }, [])

  const setState = useCallback((updater: (prev: HabitTrackerState) => HabitTrackerState) => {
    setStateInternal((prev) => bumpUpdatedAt(updater(prev)))
  }, [])

  useEffect(() => {
    saveHabitTrackerToStorage(state)
  }, [state])

  const pullRemote = useCallback(async () => {
    const token = effectiveToken
    if (!token) return
    remoteReadyRef.current = false
    setSyncHint('Syncing…')
    try {
      const remoteRaw = await fetchRemoteHabits(token)
      setStateInternal((prev) => {
        if (!remoteRaw || !remoteRaw.trim()) {
          if (stateHasPayload(prev)) {
            void pushRemoteHabits(token, serializeHabitTrackerState(prev)).catch(() => {})
          }
          return prev
        }
        return mergePull(prev, remoteRaw)
      })
      setSyncHint(`Synced ${new Date().toLocaleTimeString()}`)
    } catch (e) {
      setSyncHint(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      remoteReadyRef.current = true
    }
  }, [effectiveToken])

  const syncNow = useCallback(async () => {
    const token = effectiveToken
    if (!token) {
      setSyncHint('Sync is not configured yet.')
      return
    }
    setSyncHint('Syncing…')
    try {
      const prev = stateRef.current
      const remoteRaw = await fetchRemoteHabits(token)
      const next = mergePull(prev, remoteRaw)
      setStateInternal(next)
      await pushRemoteHabits(token, serializeHabitTrackerState(next))
      setSyncHint(`Synced ${new Date().toLocaleTimeString()}`)
    } catch (e) {
      setSyncHint(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      remoteReadyRef.current = true
    }
  }, [effectiveToken])

  useEffect(() => {
    if (!effectiveToken) {
      remoteReadyRef.current = false
      return
    }
    const schedule = window.setTimeout(() => {
      void pullRemote()
    }, 0)
    return () => window.clearTimeout(schedule)
  }, [effectiveToken, pullRemote])

  useEffect(() => {
    const token = effectiveToken
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
  }, [state, effectiveToken])

  return {
    state,
    setState,
    /** Manual token (optional if `VITE_HABIT_SYNC_SECRET` is set at build time). */
    setSyncToken,
    syncHint: effectiveToken ? syncHint : null,
    syncNow,
    canSync: Boolean(effectiveToken),
    showManualTokenHint: !hasBuiltInToken,
  }
}
