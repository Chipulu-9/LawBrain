import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Send, Scale, ArrowRight, Plus, Menu, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'

const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8082'

type Role = 'user' | 'assistant'

interface Citation {
  uri: string | null
  title: string | null
}

interface ChatMessage {
  messageId: string
  role: Role
  content: string
  timestamp: Date
  citations?: Citation[]
}

interface ChatSession {
  chatId: string
  title: string
  createdAt: Date | null
  updatedAt: Date | null
}

const SUGGESTIONS = [
  'What are my rights if arrested?',
  'Explain freedom of expression',
  'Tell me about land ownership',
]

function formatTime(value: Date) {
  return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(value: Date | null) {
  if (!value) return 'Just now'
  return value.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function renderText(text: string) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function ChatbotPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [chatSessionsLoading, setChatSessionsLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [isAwaitingAssistant, setIsAwaitingAssistant] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const initialQueryRef = useRef<string | null>(
    ((location.state as { query?: string } | null)?.query || '').trim() || null
  )

  const chatsRef = useMemo(() => {
    if (!user) return null
    return collection(db, 'users', user.uid, 'chats')
  }, [user])

  const currentChatIdRef = useRef<string | null>(null)
  useEffect(() => {
    currentChatIdRef.current = currentChatId
  }, [currentChatId])

  const activeChat = chatSessions.find(chat => chat.chatId === currentChatId) ?? null

  useEffect(() => {
    if (!chatsRef || !user) return

    let isMounted = true

    const createChatSession = async () => {
      const newChatRef = doc(chatsRef)
      await setDoc(newChatRef, {
        title: 'New Chat',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const localSession: ChatSession = {
        chatId: newChatRef.id,
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      if (!isMounted) return null
      setChatSessions(prev => [
        localSession,
        ...prev.filter(session => session.chatId !== localSession.chatId),
      ])
      setCurrentChatId(newChatRef.id)
      return newChatRef.id
    }

    const loadChatSessions = async () => {
      try {
        setChatSessionsLoading(true)
        const chatQuery = query(chatsRef, orderBy('updatedAt', 'desc'))
        const snapshot = await getDocs(chatQuery)
        if (!isMounted) return

        const sessions = snapshot.docs.map(
          (chatDoc: { id: string; data: () => Record<string, unknown> }) => {
            const data = chatDoc.data() as {
              title?: string
              createdAt?: Timestamp
              updatedAt?: Timestamp
            }

            return {
              chatId: chatDoc.id,
              title: data.title?.trim() || 'New Chat',
              createdAt: data.createdAt ? data.createdAt.toDate() : null,
              updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
            } satisfies ChatSession
          }
        )

        if (sessions.length === 0) {
          await createChatSession()
          return
        }

        setChatSessions(sessions)
        setCurrentChatId(prev => prev ?? sessions[0].chatId)
      } catch (error) {
        console.error('Failed to load chat sessions:', error)
        setHistoryError('Unable to load conversations. Please refresh and try again.')
      } finally {
        if (isMounted) setChatSessionsLoading(false)
      }
    }

    void loadChatSessions()

    return () => {
      isMounted = false
    }
  }, [chatsRef, user])

  useEffect(() => {
    if (!user || !currentChatId) return

    let isMounted = true
    const loadMessages = async () => {
      try {
        setHistoryLoading(true)
        setHistoryError(null)
        setIsAwaitingAssistant(false)

        const messagesRef = collection(db, 'users', user.uid, 'chats', currentChatId, 'messages')
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'))
        const snapshot = await getDocs(messagesQuery)
        if (!isMounted) return

        const history = snapshot.docs
          .map((messageDoc: { id: string; data: () => Record<string, unknown> }) => {
            const data = messageDoc.data() as {
              messageId?: string
              role?: Role
              content?: string
              timestamp?: Timestamp
              citations?: Citation[]
            }

            if (!data.content || !data.role || !data.timestamp) return null
            return {
              messageId: data.messageId ?? messageDoc.id,
              role: data.role,
              content: data.content,
              timestamp: data.timestamp.toDate(),
              ...(data.citations ? { citations: data.citations } : {}),
            } satisfies ChatMessage
          })
          .filter((item: ChatMessage | null): item is ChatMessage => item !== null)

        setMessages(history)
      } catch (error) {
        console.error('Failed to load chat history:', error)
        if (isMounted) setHistoryError('Unable to load chat history. Please refresh and try again.')
      } finally {
        if (isMounted) setHistoryLoading(false)
      }
    }

    void loadMessages()

    return () => {
      isMounted = false
    }
  }, [user, currentChatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAwaitingAssistant, historyLoading])

  function upsertChatSessionLocally(chatId: string, updates: Partial<ChatSession>) {
    setChatSessions(prev => {
      const existing = prev.find(session => session.chatId === chatId)
      if (!existing) return prev
      const updated: ChatSession = {
        ...existing,
        ...updates,
      }
      const filtered = prev.filter(session => session.chatId !== chatId)
      return [updated, ...filtered]
    })
  }

  async function persistMessage(
    chatId: string,
    role: Role,
    content: string,
    citations?: Citation[]
  ) {
    if (!user) return

    const messagesRef = collection(db, 'users', user.uid, 'chats', chatId, 'messages')
    const messageRef = doc(messagesRef)
    await setDoc(messageRef, {
      messageId: messageRef.id,
      role,
      content,
      timestamp: serverTimestamp(),
      ...(citations && citations.length > 0 ? { citations } : {}),
    })

    const titleUpdate =
      role === 'user' && (activeChat?.title === 'New Chat' || !activeChat?.title)
        ? `${content.slice(0, 60)}${content.length > 60 ? '...' : ''}`
        : undefined

    await setDoc(
      doc(db, 'users', user.uid, 'chats', chatId),
      {
        updatedAt: serverTimestamp(),
        ...(titleUpdate ? { title: titleUpdate } : {}),
      },
      { merge: true }
    )

    upsertChatSessionLocally(chatId, {
      updatedAt: new Date(),
      ...(titleUpdate ? { title: titleUpdate } : {}),
    })
  }

  async function handleNewChat() {
    if (!user || !chatsRef) return

    if (
      (messages.length > 0 || isAwaitingAssistant) &&
      !window.confirm('Start a new chat conversation?')
    ) {
      return
    }

    const newChatRef = doc(chatsRef)
    await setDoc(newChatRef, {
      title: 'New Chat',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    const newSession: ChatSession = {
      chatId: newChatRef.id,
      title: 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setChatSessions(prev => [newSession, ...prev])
    setCurrentChatId(newChatRef.id)
    setMessages([])
    setInput('')
    setHistoryError(null)
    setHistoryLoading(false)
    setIsAwaitingAssistant(false)
  }

  async function handleSend(rawText?: string) {
    const userText = (rawText ?? input).trim()
    if (!user || !userText || isAwaitingAssistant || !currentChatId) return

    const targetChatId = currentChatId

    const localUserMessage: ChatMessage = {
      messageId: `local-user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, localUserMessage])
    setInput('')
    setIsAwaitingAssistant(true)

    try {
      await persistMessage(targetChatId, 'user', userText)
    } catch (error) {
      console.error('Failed to persist user message:', error)
    }

    try {
      console.log('Sending to RAG:', { url: RAG_API_URL, question: userText })

      const response = await fetch(RAG_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText }),
      })

      if (!response.ok) {
        throw new Error(`RAG API returned ${response.status}: ${response.statusText}`)
      }

      const result = (await response.json()) as { answer: string; citations: Citation[] }
      console.log('RAG response received:', {
        answerLength: result.answer.length,
        citations: result.citations.length,
      })

      const localAssistantMessage: ChatMessage = {
        messageId: `local-assistant-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        citations: result.citations.slice(0, 4),
      }

      if (currentChatIdRef.current === targetChatId) {
        setMessages(prev => [...prev, localAssistantMessage])
      }

      await persistMessage(targetChatId, 'assistant', result.answer, result.citations.slice(0, 4))
    } catch (error) {
      console.error('Full error:', error)
      console.error('Failed to generate RAG response:', error)

      const fallbackText =
        'I could not retrieve the legal corpus response right now. Please try again in a moment.'
      const fallbackAssistantMessage: ChatMessage = {
        messageId: `local-assistant-${Date.now()}`,
        role: 'assistant',
        content: fallbackText,
        timestamp: new Date(),
      }

      if (currentChatIdRef.current === targetChatId) {
        setMessages(prev => [...prev, fallbackAssistantMessage])
      }

      try {
        await persistMessage(targetChatId, 'assistant', fallbackText)
      } catch (persistError) {
        console.error('Failed to persist fallback assistant message:', persistError)
      }
    } finally {
      if (currentChatIdRef.current === targetChatId) {
        setIsAwaitingAssistant(false)
      }
    }
  }

  useEffect(() => {
    if (historyLoading || !initialQueryRef.current || !currentChatId) return
    const queryText = initialQueryRef.current
    initialQueryRef.current = null
    void handleSend(queryText)
  }, [historyLoading, currentChatId])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  function handleSelectChat(chatId: string) {
    setCurrentChatId(chatId)
    setMobileSidebarOpen(false)
  }

  return (
    <section className="h-screen parchment-pattern">
      <header className="fixed top-0 left-0 right-0 h-16 z-40 border-b border-brown-200 bg-[hsl(35_60%_97%)]/95 backdrop-blur-sm">
        <div className="h-full max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-brown-700 hover:bg-brown-100 transition-all duration-200"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="w-8 h-8 rounded-lg bg-brown-700 flex items-center justify-center">
              <Scale className="w-4 h-4 text-brown-100" />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-lg font-700 text-brown-900 leading-tight">
                LawBrain Chat
              </p>
              <p className="text-xs text-brown-600 truncate">
                {activeChat?.title || 'Zambian Legal Assistant'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setMobileSidebarOpen(v => !v)}
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-brown-700 hover:bg-brown-100 transition-all duration-200"
            aria-label="Toggle conversations"
          >
            {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="h-full pt-16">
        <div className="h-full flex relative">
          {mobileSidebarOpen && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden fixed inset-0 top-16 bg-black/30 z-40"
              aria-label="Close conversations panel"
            />
          )}

          <aside
            className={`fixed md:relative top-16 md:top-0 left-0 h-[calc(100vh-4rem)] md:h-full w-72 bg-white border-r border-brown-200 shadow-md md:shadow-sm z-50 transform transition-transform duration-300 ${
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            <div className="p-3 border-b border-brown-200">
              <button
                onClick={() => {
                  void handleNewChat()
                  setMobileSidebarOpen(false)
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brown-700 text-brown-50 hover:bg-brown-800 transition-all duration-200 shadow-sm"
                aria-label="Start new chat"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>
            <div className="h-[calc(100%-4.125rem)] overflow-y-auto p-2 space-y-2">
              {chatSessionsLoading && (
                <span className="text-xs text-brown-600 px-2 py-1 block">
                  Loading conversations...
                </span>
              )}
              {!chatSessionsLoading &&
                chatSessions.map(chat => (
                  <button
                    key={chat.chatId}
                    onClick={() => handleSelectChat(chat.chatId)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all duration-200 ${
                      currentChatId === chat.chatId
                        ? 'bg-brown-700 text-brown-50 border-brown-700'
                        : 'bg-brown-50 text-brown-700 border-brown-200 hover:bg-brown-100'
                    }`}
                  >
                    <p className="text-xs font-semibold truncate">{chat.title}</p>
                    <p
                      className={`text-[10px] mt-0.5 ${
                        currentChatId === chat.chatId ? 'text-brown-200' : 'text-brown-500'
                      }`}
                    >
                      {formatDate(chat.updatedAt || chat.createdAt)}
                    </p>
                  </button>
                ))}
            </div>
          </aside>

          <main className="flex-1 min-w-0 relative">
            <div className="h-full overflow-y-auto pb-[88px]">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-4">
                {historyLoading && (
                  <div className="h-full min-h-[40vh] flex items-center justify-center text-brown-700">
                    Loading chat history...
                  </div>
                )}

                {!historyLoading && historyError && (
                  <div className="max-w-md mx-auto bg-white border border-red-200 rounded-xl p-4 text-center text-red-700 text-sm">
                    {historyError}
                  </div>
                )}

                {!historyLoading && !historyError && messages.length === 0 && (
                  <div className="space-y-4">
                    <div className="bg-white border border-brown-200 rounded-2xl p-4 text-sm text-brown-800 shadow-sm">
                      Hello! I am <strong>LawBrain</strong>. Ask any question about Zambian law and
                      I will help with source-grounded answers.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS.map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            void handleSend(suggestion)
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brown-700 bg-white border border-brown-200 rounded-full px-3 py-1.5 hover:bg-brown-100 transition-all duration-200"
                        >
                          <ArrowRight className="w-3 h-3 text-amber-600" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!historyLoading &&
                  !historyError &&
                  messages.map(message => (
                    <div
                      key={message.messageId}
                      className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          message.role === 'user'
                            ? 'bg-brown-700 text-brown-50 rounded-tr-sm'
                            : 'bg-white border border-brown-200 text-brown-800 rounded-tl-sm'
                        }`}
                      >
                        {message.content.split('\n').map((line, i) => (
                          <p key={`${message.messageId}-${i}`} className={i > 0 ? 'mt-1.5' : ''}>
                            {renderText(line)}
                          </p>
                        ))}

                        {message.role === 'assistant' &&
                          message.citations &&
                          message.citations.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-brown-100">
                              <p className="text-[10px] font-semibold text-brown-500 uppercase tracking-wide mb-1.5">
                                Sources
                              </p>
                              <ul className="space-y-0.5">
                                {message.citations.map((c, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-[10px] text-amber-600 font-bold mt-px">
                                      {i + 1}.
                                    </span>
                                    <span className="text-[10px] text-brown-500 break-all">
                                      {c.title || c.uri || 'Unknown source'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        <p
                          className={`text-[10px] mt-2 ${
                            message.role === 'user' ? 'text-brown-200' : 'text-brown-400'
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}

                {isAwaitingAssistant && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 bg-white border border-brown-200 rounded-2xl rounded-tl-sm shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-brown-500 animate-bounce" />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-brown-500 animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-brown-500 animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="absolute left-0 right-0 bottom-0 z-30 border-t border-brown-200 bg-white">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your legal question... (Enter to send)"
                  rows={1}
                  className="flex-1 resize-none bg-brown-50 border border-brown-200 rounded-xl px-3 py-2.5 text-sm text-brown-900 placeholder-brown-400 outline-none focus:border-brown-500 focus:ring-1 focus:ring-brown-300 transition-all max-h-28 leading-relaxed"
                />
                <button
                  onClick={() => {
                    void handleSend()
                  }}
                  disabled={
                    !input.trim() || historyLoading || isAwaitingAssistant || !currentChatId
                  }
                  className="flex-shrink-0 p-2.5 bg-brown-700 hover:bg-brown-800 disabled:opacity-40 disabled:cursor-not-allowed text-brown-50 rounded-xl shadow transition-all duration-200"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  )
}
