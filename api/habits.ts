import { Redis } from '@upstash/redis'

const KV_KEY = 'habit-dashboard:state-v1'
const MAX_PAYLOAD = 120_000

function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  return Boolean(url?.trim() && token?.trim())
}

async function getRemoteHabitJson(): Promise<string | null> {
  const redis = Redis.fromEnv()
  const v = await redis.get(KV_KEY)
  if (v == null || v === '') return null
  return typeof v === 'string' ? v : JSON.stringify(v)
}

async function setRemoteHabitJson(json: string): Promise<void> {
  const redis = Redis.fromEnv()
  await redis.set(KV_KEY, json)
}

function authHeader(headers: Record<string, string | string[] | undefined>): string | undefined {
  const a = headers.authorization
  const b = headers.Authorization
  const raw = a ?? b
  return Array.isArray(raw) ? raw[0] : raw
}

function extractBearer(h: string | undefined): string | null {
  if (!h || typeof h !== 'string') return null
  const t = h.trim()
  if (!t.toLowerCase().startsWith('bearer ')) return null
  return t.slice(7).trim()
}

function tokenEquals(secret: string, token: string): boolean {
  if (!secret || !token) return false
  if (secret.length !== token.length) return false
  let i = 0
  for (let j = 0; j < secret.length; j++) {
    i |= secret.charCodeAt(j) ^ token.charCodeAt(j)
  }
  return i === 0
}

function bodyToRaw(body: unknown, method: string): string {
  if (method === 'GET' || method === 'HEAD') return ''
  if (typeof body === 'string') return body
  if (body && typeof body === 'object') return JSON.stringify(body)
  return ''
}

type ApiReq = {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

type ApiRes = {
  status: (n: number) => { json: (b: unknown) => void }
}

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
    const method = req.method ?? 'GET'
    const rawBody = bodyToRaw(req.body, method)

    const secret = process.env.HABIT_SYNC_SECRET?.trim() ?? ''
    if (!secret) {
      return res.status(503).json({
        error: 'Sync not configured on server (set HABIT_SYNC_SECRET in Vercel).',
      })
    }
    if (!isRedisConfigured()) {
      return res.status(503).json({
        error:
          'Sync storage not configured. Add Upstash Redis via Vercel Integrations and redeploy.',
      })
    }

    const token = extractBearer(authHeader(req.headers ?? {}))
    if (!token || !tokenEquals(secret, token)) {
      return res.status(401).json({ error: 'Invalid or missing sync token.' })
    }

    if (method === 'GET' || method === 'HEAD') {
      const data = await getRemoteHabitJson()
      return res.status(200).json({ json: data ?? '' })
    }

    if (method === 'PUT' || method === 'POST') {
      let parsed: { json?: unknown }
      try {
        parsed = rawBody ? (JSON.parse(rawBody) as { json?: unknown }) : {}
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body.' })
      }
      const payload = typeof parsed.json === 'string' ? parsed.json : ''
      if (payload.length > MAX_PAYLOAD) {
        return res.status(400).json({ error: 'Habit data is too large.' })
      }
      await setRemoteHabitJson(payload)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('[api/habits]', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    })
  }
}
