import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@repo/functions/router'

export const trpc = createTRPCReact<AppRouter>()
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const apiUrl = `${apiBaseUrl.replace(/\/$/, '')}/api/trpc`

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: apiUrl,
    }),
  ],
})
