function habitsApiUrl(): string {
  const base = import.meta.env.VITE_HABITS_API_BASE?.replace(/\/$/, '') ?? ''
  return `${base}/api/habits`
}

export async function fetchRemoteHabits(token: string): Promise<string> {
  const res = await fetch(habitsApiUrl(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = (await res.json().catch(() => ({}))) as { json?: string; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Pull failed (${res.status})`)
  }
  return typeof data.json === 'string' ? data.json : ''
}

export async function pushRemoteHabits(token: string, json: string): Promise<void> {
  const res = await fetch(habitsApiUrl(), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ json }),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
}
