import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

const ASK_RAG_URL = process.env.ASK_RAG_URL || 'http://localhost:8082'

export const chatRouter = router({
  ask: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        chatId: z.string(),
        question: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const res = await fetch(ASK_RAG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input.question }),
      })

      if (!res.ok) {
        throw new Error(`ask_rag returned ${res.status}: ${await res.text()}`)
      }

      const data = (await res.json()) as {
        answer: string
        citations: Array<{ uri: string | null; title: string | null }>
      }

      return {
        answer: data.answer,
        sources: data.citations.map((c, i) => ({
          source: c.uri ?? null,
          title: c.title ?? 'Unknown source',
          pageNumber: null as number | null,
          chunkIndex: i,
          snippet: '',
        })),
      }
    }),
})
