import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import { appRouter, type AppRouter } from './trpc/router'
import { runRagDiagnostics } from './lib/rag'
import { ingestDocuments } from '../../ingestion/src/index'

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

const trpcHandler = createHTTPHandler({
  router: appRouter,
  createContext: ({ req }) => ({
    geminiApiKey: (req as { geminiApiKey?: string }).geminiApiKey,
  }),
})

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 30
const rateLimitBuckets = new Map<string, { windowStart: number; count: number }>()
let hasLoggedGeminiSecretLoaded = false

function ensureGeminiApiKeyLoaded() {
  // Runtime-only secret access: never evaluate at module scope.
  const geminiApiKey = GEMINI_API_KEY.value()

  if (!geminiApiKey) {
    throw new Error('Missing GEMINI_API_KEY secret.')
  }

  if (!hasLoggedGeminiSecretLoaded) {
    console.log('[Secrets] GEMINI_API_KEY loaded successfully')
    hasLoggedGeminiSecretLoaded = true
  }

  return geminiApiKey
}

function normalizeTrpcUrl(url: string) {
  const [pathPart, queryPart] = url.split('?')
  let normalizedPath = pathPart

  if (normalizedPath.startsWith('/api/trpc/')) {
    normalizedPath = normalizedPath.replace('/api/trpc/', '/')
  } else if (normalizedPath === '/api/trpc') {
    normalizedPath = '/'
  } else if (normalizedPath.startsWith('/trpc/')) {
    normalizedPath = normalizedPath.replace('/trpc/', '/')
  } else if (normalizedPath === '/trpc') {
    normalizedPath = '/'
  }

  return queryPart ? `${normalizedPath}?${queryPart}` : normalizedPath
}

function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }) {
  const forwardedFor = req.headers['x-forwarded-for']
  const firstForwardedIp =
    typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : Array.isArray(forwardedFor)
        ? forwardedFor[0]?.split(',')[0]?.trim()
        : undefined
  return firstForwardedIp || req.socket?.remoteAddress || 'unknown'
}

function isRateLimited(clientKey: string, now = Date.now()) {
  const existing = rateLimitBuckets.get(clientKey)
  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(clientKey, { windowStart: now, count: 1 })
    return false
  }

  existing.count += 1
  if (existing.count > RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  if (rateLimitBuckets.size > 5000) {
    for (const [key, value] of rateLimitBuckets.entries()) {
      if (now - value.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitBuckets.delete(key)
      }
    }
  }

  return false
}

export const api = onRequest({ cors: true, secrets: [GEMINI_API_KEY] }, (req, res) => {
  let geminiApiKey: string
  try {
    geminiApiKey = ensureGeminiApiKeyLoaded()
  } catch (error) {
    const err = error as Error
    res.status(500).json({
      error: err.message,
    })
    return
  }

  const requestOrigin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', requestOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-trpc-source')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  console.log('[API] Incoming request', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
  })

  const originalUrl = req.url || '/'
  const normalizedUrl = normalizeTrpcUrl(originalUrl)
  req.url = normalizedUrl

  const isChatAskRequest = req.method === 'POST' && normalizedUrl.startsWith('/chat.ask')
  if (isChatAskRequest) {
    const clientKey = `${getClientIp(req)}:${req.headers['user-agent'] || 'unknown'}`
    if (isRateLimited(clientKey)) {
      res.status(429).json({
        error: 'Too many requests. Please wait and try again.',
      })
      return
    }
  }

  console.log('[API] Normalized tRPC URL', {
    originalUrl,
    normalizedUrl,
  })

  ;(req as { geminiApiKey?: string }).geminiApiKey = geminiApiKey
  trpcHandler(req, res)
})

export const diagnostics = onRequest(
  { cors: true, secrets: [GEMINI_API_KEY] },
  async (req, res) => {
    let geminiApiKey: string
    try {
      geminiApiKey = ensureGeminiApiKeyLoaded()
    } catch (error) {
      const err = error as Error
      res.status(500).json({
        error: err.message,
      })
      return
    }

  const requestOrigin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', requestOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    const report = await runRagDiagnostics(geminiApiKey)
    res.status(200).json(report)
  } catch (error) {
    const err = error as Error
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    })
  }
  }
)

export const ingestion = onRequest(
  { cors: true, secrets: [GEMINI_API_KEY] },
  async (req, res) => {
    const requestOrigin = req.headers.origin || '*'
    res.setHeader('Access-Control-Allow-Origin', requestOrigin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use POST.' })
      return
    }

    try {
      // Runtime-only secret access inside the function handler.
      const geminiApiKey = GEMINI_API_KEY.value()
      if (!geminiApiKey) {
        throw new Error('Missing GEMINI_API_KEY secret.')
      }

      const data = req.body && typeof req.body === 'object' ? req.body : {}
      await ingestDocuments(data, { geminiApiKey })

      res.status(200).json({ status: 'Ingestion started' })
    } catch (error) {
      const err = error as Error
      res.status(500).json({ error: err.message })
    }
  }
)

export type { AppRouter }
