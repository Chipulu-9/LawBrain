import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './trpc/router'

const app = express()

app.use(cors())

app.use(
  '/api/trpc',
  createExpressMiddleware({ router: appRouter })
)

const PORT = process.env.PORT ?? 5001

app.listen(PORT, () => {
  console.log(`tRPC server running at http://localhost:${PORT}/api/trpc`)
  console.log(`ASK_RAG_URL: ${process.env.ASK_RAG_URL ?? 'http://localhost:8082 (default)'}`)
})
