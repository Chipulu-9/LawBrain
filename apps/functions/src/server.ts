import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './trpc/router.js'
import { generateRagAnswer } from './lib/rag.js'

const app = express()

const allowedOrigins = [
  'http://localhost:5173', // Vite dev
  'http://localhost:3000', // fallback
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
]

app.use(
  cors({
    origin: (origin, cb) => {
      // allow server-to-server calls (no Origin header) and listed origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
  })
)
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/trpc', createExpressMiddleware({ router: appRouter }))

app.post('/api/chat', async (req, res) => {
  const { message } = req.body as { message?: string }
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message is required' })
    return
  }
  try {
    const result = await generateRagAnswer(message.trim())
    res.json(result)
  } catch (err) {
    console.error('/api/chat error:', err)
    res.status(500).json({ error: 'Failed to generate response' })
  }
})

const PORT = process.env.PORT ?? 4000

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`  tRPC  → http://localhost:${PORT}/api/trpc`)
  console.log(`  Chat  → POST http://localhost:${PORT}/api/chat`)
})
