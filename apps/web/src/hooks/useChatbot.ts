import { useState, useCallback } from 'react'

const CHAT_API_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_CHAT_API_URL ||
  'http://localhost:4000/api/chat'

export interface ChatSource {
  source: string | null
  title: string
  pageNumber: number | null
  chunkIndex: number
  snippet: string
}

export interface ChatbotResponse {
  answer: string
  sources: ChatSource[]
}

export function useChatbot() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (message: string): Promise<ChatbotResponse> => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      return (await res.json()) as ChatbotResponse
    } catch (err) {
      const msg = (err as Error).message
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { sendMessage, isLoading, error }
}
