import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './trpc/router.js'
import { generateRagAnswer } from './lib/rag.js'

const app = express()

app.use(cors())
app.use(express.json())

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
