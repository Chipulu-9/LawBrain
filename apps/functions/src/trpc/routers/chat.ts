import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { generateRagAnswer } from '../../lib/rag.js'

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
      console.log('=== tRPC chat.ask ===')
      console.log('User:', input.userId, '| Chat:', input.chatId)
      console.log('Question:', input.question.slice(0, 120))

      const result = await generateRagAnswer(input.question)

      console.log('=== tRPC chat.ask complete ===')
      console.log('Answer length:', result.answer.length, '| Sources:', result.sources.length)

      return result
    }),
})
