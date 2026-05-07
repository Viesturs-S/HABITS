/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HABITS_API_BASE?: string
  /** Same value as server `HABIT_SYNC_SECRET`; embedded in the JS bundle at build time. */
  readonly VITE_HABIT_SYNC_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
