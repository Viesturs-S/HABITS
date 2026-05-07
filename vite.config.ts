import type { IncomingMessage } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { Redis } from '@upstash/redis'

const KV_KEY = 'habit-dashboard:state-v1'
const MAX_PAYLOAD = 120_000

function isRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
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

function bodyToRaw(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c as Buffer))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function handleHabitsDev(
  method: string,
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
): Promise<{ status: number; body: unknown }> {
  const secret = process.env.HABIT_SYNC_SECRET?.trim() ?? ''
  if (!secret) {
    return {
      status: 503,
      body: { error: 'Sync not configured (add HABIT_SYNC_SECRET to .env.local).' },
    }
  }
  if (!isRedisConfigured()) {
    return {
      status: 503,
      body: { error: 'Add Upstash Redis env vars to .env.local for dev sync, or test on Vercel.' },
    }
  }

  const token = extractBearer(authHeader(headers))
  if (!token || !tokenEquals(secret, token)) {
    return { status: 401, body: { error: 'Invalid or missing sync token.' } }
  }

  if (method === 'GET' || method === 'HEAD') {
    const data = await getRemoteHabitJson()
    return { status: 200, body: { json: data ?? '' } }
  }

  if (method === 'PUT' || method === 'POST') {
    let parsed: { json?: unknown }
    try {
      parsed = rawBody ? (JSON.parse(rawBody) as { json?: unknown }) : {}
    } catch {
      return { status: 400, body: { error: 'Invalid JSON body.' } }
    }
    const payload = typeof parsed.json === 'string' ? parsed.json : ''
    if (payload.length > MAX_PAYLOAD) {
      return { status: 400, body: { error: 'Habit data is too large.' } }
    }
    await setRemoteHabitJson(payload)
    return { status: 200, body: { ok: true } }
  }

  return { status: 405, body: { error: 'Method not allowed' } }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const name of ['HABIT_SYNC_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
    const v = env[name]?.trim()
    if (v) process.env[name] = v
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-habits-dev',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = (req.url ?? '').split('?')[0]
            if (url !== '/api/habits') {
              next()
              return
            }

            res.setHeader('Content-Type', 'application/json')
            try {
              const method = req.method ?? 'GET'
              const raw = method === 'GET' || method === 'HEAD' ? '' : await bodyToRaw(req)
              const headers = req.headers as Record<string, string | string[] | undefined>
              const result = await handleHabitsDev(method, headers, raw)
              res.statusCode = result.status
              res.end(JSON.stringify(result.body))
            } catch (err) {
              console.error('[api/habits dev]', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Unexpected server error' }))
            }
          })
        },
      },
    ],
  }
})
