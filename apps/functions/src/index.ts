import express from 'express'
import cors from 'cors'
import { onRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './trpc/router.js'

export type { AppRouter } from './trpc/router.js'

setGlobalOptions({ region: 'us-west1', maxInstances: 10 })

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://lawbrain-c4581.web.app',
  'https://lawbrain-c4581.firebaseapp.com',
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
]

const app = express()

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
  })
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/trpc', createExpressMiddleware({ router: appRouter }))

export const api = onRequest(app)
