import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { generateRagAnswer } from '../../lib/rag'

const SourceSchema = z.object({
  source: z.string(),
  title: z.string(),
  pageNumber: z.number().nullable(),
  chunkIndex: z.number(),
  snippet: z.string(),
})

export const chatRouter = router({
  ask: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        chatId: z.string().min(1),
        question: z.string().min(2),
      })
    )
    .output(
      z.object({
        answer: z.string(),
        sources: z.array(SourceSchema),
      })
    )
    .mutation(async ({ input }) => {
      console.log('=== CHAT REQUEST RECEIVED ===')
      console.log('Chat input:', {
        userId: input.userId,
        chatId: input.chatId,
        questionLength: input.question.length,
        questionPreview: input.question.slice(0, 140),
      })

      try {
        const result = await generateRagAnswer(input.question)

        console.log('=== CHAT RESPONSE READY ===')
        console.log('Response summary:', {
          answerLength: result.answer.length,
          sourceCount: result.sources.length,
        })

        return {
          answer: result.answer,
          sources: result.sources,
        }
      } catch (error) {
        const err = error as Error
        const message = err.message || ''

        console.error('=== ERROR ===')
        console.error('Error type:', err.name || 'UnknownError')
        console.error('Error message:', message)
        console.error('Stack:', err.stack)

        if (message.toLowerCase().includes('api key')) {
          console.error('Missing or invalid API key')
        } else if (message.toLowerCase().includes('rate limit')) {
          console.error('Rate limited by API')
        } else if (message.includes('ECONNREFUSED')) {
          console.error('Cannot connect to external service')
        }

        throw error
      }
    }),
})
