import { initTRPC } from '@trpc/server'

export interface TrpcContext {
  geminiApiKey?: string
}

const t = initTRPC.context<TrpcContext>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory
