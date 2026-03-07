import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Scale, Plus, Trash2, Menu, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'

const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8082'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function makeWelcome(text: string): Message {
  return {
    id: 'welcome-' + Date.now(),
    role: 'assistant',
    text,
    time: now(),
  }
}

function newSession(welcomeText: string): ChatSession {
  return { id: Date.now().toString(), title: 'New Chat', messages: [makeWelcome(welcomeText)] }
}

const SUGGESTIONS = [
  'What are my rights if arrested?',
  'Explain freedom of expression',
  'Tell me about land ownership',
]

function renderText(text: string) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-stone-900">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

const WELCOME_TEXT =
  "Hello! I'm **LawBrain**, your AI legal assistant for Zambian law. Ask me anything about the Constitution, Acts, or Statutes — I'll answer with cited sources.\n\nWhat would you like to know?"

export function ChatbotWidget() {
  const { user } = useAuth()
  const { t, isDetecting, detectAndSetLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const [showPulse, setShowPulse] = useState(true)
  const [sessions, setSessions] = useState<ChatSession[]>(() => [newSession(WELCOME_TEXT)])
  const [activeId, setActiveId] = useState('')
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const handleSendRef = useRef<((text?: string) => void) | null>(null)

  // activeId='' falls back to sessions[0] via activeSession below
  const activeSession = sessions.find(s => s.id === activeId) ?? sessions[0]
  const messages = activeSession?.messages ?? []

  useEffect(() => {
    if (open) setShowPulse(false)
  }, [open])

  useEffect(() => {
    function onOpenChat(e: CustomEvent<{ query: string }>) {
      const q = e.detail?.query?.trim()
      setOpen(true)
      setSidebarOpen(false)
      if (q) {
        setInput(q)
        setTimeout(() => handleSendRef.current?.(q), 150)
      }
    }
    window.addEventListener('lawbrain-open-chat', onOpenChat as EventListener)
    return () => window.removeEventListener('lawbrain-open-chat', onOpenChat as EventListener)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  function handleNewChat() {
    const s = newSession(WELCOME_TEXT)
    setSessions(prev => [s, ...prev])
    setActiveId(s.id)
    setInput('')
    setSidebarOpen(false)
    setDeleteConfirmId(null)
  }

  function handleSelectSession(id: string) {
    setActiveId(id)
    setInput('')
    setSidebarOpen(false)
    setDeleteConfirmId(null)
  }

  function handleDeleteSession(id: string) {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id)
      if (updated.length === 0) {
        const s = newSession(WELCOME_TEXT)
        setActiveId(s.id)
        return [s]
      }
      if (id === activeId || id === activeSession?.id) {
        setActiveId(updated[0].id)
      }
      return updated
    })
    setDeleteConfirmId(null)
  }

  function handleSend(text?: string) {
    const userText = (text ?? input).trim()
    if (!userText || loading) return

    const sessionId = activeSession?.id ?? sessions[0]?.id
    if (!sessionId) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      time: now(),
    }

    setSessions(prev =>
      prev.map(s => {
        if (s.id !== sessionId) return s
        const isFirst = !s.messages.some(m => m.role === 'user')
        return {
          ...s,
          messages: [...s.messages, userMsg],
          title: isFirst ? userText.slice(0, 40) + (userText.length > 40 ? '…' : '') : s.title,
        }
      })
    )
    setInput('')
    setLoading(true)
    ;(async () => {
      try {
        // Detect language first, then send to RAG — RAG will reply in that language
        const detectedLocale = await detectAndSetLanguage(userText)

        const response = await fetch(RAG_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: userText,
            locale: detectedLocale,
            response_language: detectedLocale,
          }),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          answer: string
          citations: { uri: string | null; title: string | null }[]
        }
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: result.answer,
          time: now(),
        }
        setSessions(prev =>
          prev.map(s => (s.id === sessionId ? { ...s, messages: [...s.messages, aiMsg] } : s))
        )
      } catch (err) {
        console.error('[ChatbotWidget] RAG fetch failed:', err)
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: t('chat.error', 'Sorry, I could not reach the AI service. Please try again later.'),
          time: now(),
        }
        setSessions(prev =>
          prev.map(s => (s.id === sessionId ? { ...s, messages: [...s.messages, errMsg] } : s))
        )
      } finally {
        setLoading(false)
      }
    })()
  }
  handleSendRef.current = handleSend

  if (!user) return null

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* ── Fullscreen Chat Panel ── */}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-br from-stone-50 via-amber-50/30 to-amber-100/40 animate-slide-up-full">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-stone-200 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="md:hidden p-1.5 rounded-lg hover:bg-stone-100 transition text-stone-500 hover:text-stone-700"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shadow-sm border border-amber-200 flex-shrink-0">
              <Scale className="w-4 h-4 text-amber-700" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif font-bold text-sm text-stone-800 leading-tight">
                LawBrain AI
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-stone-500">
                  {t('app.tagline', 'Zambian Legal Assistant')}
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-stone-100 transition text-stone-500 hover:text-stone-700"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: sidebar + chat */}
          <div className="relative flex flex-1 min-h-0">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="md:hidden absolute inset-0 bg-black/40 z-10"
                aria-label="Close sidebar"
              />
            )}

            {/* Sidebar */}
            <aside
              className={`absolute md:relative top-0 left-0 h-full w-64 z-20 bg-white border-r border-stone-200 flex flex-col flex-shrink-0 transition-transform duration-300 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } md:translate-x-0`}
            >
              <div className="p-3 border-b border-stone-200">
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 text-sm font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  {t('nav.chat', 'New Chat')}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.map(s => (
                  <div key={s.id} className="group relative">
                    {deleteConfirmId === s.id ? (
                      <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        <p className="mb-2 font-medium">
                          {t('common.delete', 'Delete')} this chat?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteSession(s.id)}
                            className="flex-1 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold transition"
                          >
                            {t('common.delete', 'Delete')}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 transition"
                          >
                            {t('common.cancel', 'Cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelectSession(s.id)}
                        className={`w-full text-left px-3 py-2 pr-8 rounded-lg text-sm transition ${
                          s.id === activeSession?.id
                            ? 'bg-amber-100 text-amber-900 border-l-2 border-amber-600'
                            : 'text-stone-600 hover:bg-amber-50 hover:text-stone-800'
                        }`}
                      >
                        <p className="truncate font-medium">{s.title}</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          {s.messages.filter(m => m.role === 'user').length} message
                          {s.messages.filter(m => m.role === 'user').length !== 1 ? 's' : ''}
                        </p>
                      </button>
                    )}
                    {deleteConfirmId !== s.id && (
                      <button
                        onClick={() => setDeleteConfirmId(s.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </aside>

            {/* Main chat area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gradient-to-br from-stone-50 via-amber-50/30 to-amber-100/40">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-serif text-xs shadow-sm border border-amber-200">
                        ⚖
                      </div>
                    )}
                    <div
                      className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-amber-700 text-white rounded-2xl rounded-br-md shadow-sm'
                            : 'bg-white border border-stone-200 text-stone-800 rounded-2xl rounded-bl-md shadow-sm'
                        }`}
                      >
                        {msg.text.split('\n').map((line, i) => (
                          <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
                            {renderText(line)}
                          </p>
                        ))}
                      </div>
                      <span className="text-[10px] text-stone-400 px-1">{msg.time}</span>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2.5 animate-fade-in">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-serif text-xs shadow-sm border border-amber-200">
                      ⚖
                    </div>
                    <div className="px-4 py-3 bg-white border border-stone-200 rounded-2xl rounded-bl-md shadow-sm">
                      {isDetecting ? (
                        <div className="flex items-center gap-2 text-xs text-amber-600">
                          <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          Detecting language…
                        </div>
                      ) : (
                        <div className="flex gap-1 items-center">
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {messages.length === 1 && !loading && (
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="flex items-center gap-1 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-full px-3 py-1.5 hover:bg-amber-50 hover:border-amber-200 transition shadow-sm"
                      >
                        <ArrowRight className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Disclaimer */}
              <div className="px-4 py-2 bg-white/80 border-t border-stone-200 flex-shrink-0">
                <p className="text-[11px] text-amber-700/80 text-center">
                  {t(
                    'chat.disclaimer',
                    'This is AI-generated information, not legal advice. Consult a lawyer for specific cases.'
                  )}
                </p>
              </div>

              {/* Input */}
              <div className="flex items-end gap-2 px-4 py-3 bg-white/80 backdrop-blur-sm border-t border-stone-200 flex-shrink-0">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('chat.placeholder', 'Type in any language... (Enter to send)')}
                  rows={1}
                  className="flex-1 resize-none bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200 transition max-h-24 leading-relaxed shadow-sm"
                  style={{ scrollbarWidth: 'none' }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="flex-shrink-0 p-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full shadow-sm transition cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 active:scale-95"
                  aria-label={t('chat.send', 'Send message')}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Button ── */}
      <div className="fixed bottom-5 right-4 sm:right-6 z-[70]">
        {showPulse && (
          <span className="absolute inset-0 rounded-full bg-amber-600 opacity-60 animate-pulse-ring" />
        )}
        {!open && (
          <div className="absolute bottom-1 right-16 bg-stone-800 text-stone-100 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap animate-fade-in pointer-events-none">
            Chat with LawBrain ⚖
          </div>
        )}
        <button
          onClick={() => setOpen(v => !v)}
          className="relative w-14 h-14 rounded-full bg-amber-700 hover:bg-amber-800 text-white shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center group hover:scale-105 active:scale-95 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          aria-label={open ? 'Close chat' : 'Open LawBrain chat'}
        >
          {open ? (
            <X className="w-6 h-6 transition-transform duration-200" />
          ) : (
            <MessageCircle className="w-6 h-6 transition-transform duration-200 group-hover:scale-110" />
          )}
          {!open && (
            <span
              className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full shadow-sm animate-pulse"
              aria-hidden
            />
          )}
        </button>
      </div>
    </>
  )
}
