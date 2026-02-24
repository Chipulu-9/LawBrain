import { onRequest } from 'firebase-functions/v2/https'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import { appRouter, type AppRouter } from './trpc/router'
import { runRagDiagnostics } from './lib/rag'

const trpcHandler = createHTTPHandler({
  router: appRouter,
})

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

export const api = onRequest({ cors: true }, (req, res) => {
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

  console.log('[API] Normalized tRPC URL', {
    originalUrl,
    normalizedUrl,
  })

  trpcHandler(req, res)
})

export const diagnostics = onRequest({ cors: true }, async (req, res) => {
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
    const report = await runRagDiagnostics()
    res.status(200).json(report)
  } catch (error) {
    const err = error as Error
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    })
  }
})

export type { AppRouter }
