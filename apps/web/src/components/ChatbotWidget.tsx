import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Scale, ArrowRight, Minimize2 } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  text: "Hello! I'm **LawBrain**, your AI legal assistant for Zambian law. Ask me anything about the Constitution, Acts, or Statutes — I'll answer with cited sources.\n\nWhat would you like to know?",
  time: now(),
}

const SUGGESTIONS = [
  'What are my rights if arrested?',
  'Explain freedom of expression',
  'Tell me about land ownership',
]

function renderText(text: string) {
  return text
    .split(/\*\*(.*?)\*\*/g)
    .map((part, i) =>
      i % 2 === 1
        ? <strong key={i} className="font-semibold text-brown-900">{part}</strong>
        : <span key={i}>{part}</span>
    )
}

/* ─── Main Widget ──────────────────────────────────────────────────── */

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPulse, setShowPulse] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /* Stop pulse after first open */
  useEffect(() => {
    if (open) setShowPulse(false)
  }, [open])

  /* Auto-scroll to latest message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* Focus input when panel opens */
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, minimized])

  function handleSend(text?: string) {
    const userText = (text ?? input).trim()
    if (!userText || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText, time: now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    /* Simulated AI response — replace with real tRPC call once backend is ready */
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `That's a great legal question about **"${userText}"**.\n\nFull AI answers are coming soon once the backend is connected. In the meantime, you can browse the legal corpus or sign up to be notified when LawBrain launches!\n\n*Sources will appear here with document citations.*`,
        time: now(),
      }
      setMessages(prev => [...prev, aiMsg])
      setLoading(false)
    }, 1500)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* ── Chat Panel ── */}
      {open && (
        <div
          className={`fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[380px] rounded-2xl shadow-2xl border border-brown-200 bg-white flex flex-col overflow-hidden animate-bounce-in ${minimized ? 'h-14' : 'h-[520px] sm:h-[560px]'} transition-all duration-300`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-brown-800 text-brown-50 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-brown-600 flex items-center justify-center shadow border border-brown-500">
              <Scale className="w-4 h-4 text-brown-100" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif font-bold text-sm text-brown-50 leading-tight">LawBrain AI</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-brown-400">Zambian Legal Assistant</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(v => !v)}
                className="p-1.5 rounded-lg hover:bg-brown-700 transition-colors text-brown-300 hover:text-brown-100"
                aria-label="Minimize"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-brown-700 transition-colors text-brown-300 hover:text-brown-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-brown-50/50">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brown-800 flex items-center justify-center text-brown-100 font-serif text-xs shadow">⚖</div>
                    )}

                    <div className={`flex flex-col gap-1 max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-brown-700 text-brown-50 rounded-tr-sm'
                            : 'bg-white border border-brown-200 text-brown-800 rounded-tl-sm'
                        }`}
                      >
                        {msg.text.split('\n').map((line, i) => (
                          <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
                            {renderText(line)}
                          </p>
                        ))}
                      </div>
                      <span className="text-[10px] text-brown-400 px-1">{msg.time}</span>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex gap-2.5 animate-fade-in">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brown-800 flex items-center justify-center text-brown-100 font-serif text-xs shadow">⚖</div>
                    <div className="px-4 py-3 bg-white border border-brown-200 rounded-2xl rounded-tl-sm shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-brown-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-brown-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-brown-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Quick suggestions (only show if just the welcome message) */}
              {messages.length === 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2 bg-brown-50/50">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="flex items-center gap-1 text-[11px] font-medium text-brown-700 bg-white border border-brown-200 rounded-full px-3 py-1.5 hover:bg-brown-100 transition-colors shadow-sm"
                    >
                      <ArrowRight className="w-3 h-3 text-amber-600" />
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="flex items-end gap-2 px-3 py-3 border-t border-brown-200 bg-white flex-shrink-0">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a question… (Enter to send)"
                  rows={1}
                  className="flex-1 resize-none bg-brown-50 border border-brown-200 rounded-xl px-3 py-2.5 text-sm text-brown-900 placeholder-brown-400 outline-none focus:border-brown-500 focus:ring-1 focus:ring-brown-300 transition-all max-h-24 leading-relaxed"
                  style={{ scrollbarWidth: 'none' }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="flex-shrink-0 p-2.5 bg-brown-700 hover:bg-brown-800 disabled:opacity-40 disabled:cursor-not-allowed text-brown-50 rounded-xl shadow transition-all"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Floating Button ── */}
      <div className="fixed bottom-5 right-4 sm:right-6 z-50">
        {/* Pulse ring */}
        {showPulse && (
          <span className="absolute inset-0 rounded-full bg-brown-500 opacity-60 animate-pulse-ring" />
        )}

        {/* Tooltip */}
        {!open && (
          <div className="absolute bottom-full right-0 mb-3 whitespace-nowrap px-3 py-1.5 bg-brown-900 text-brown-100 text-xs font-medium rounded-lg shadow-lg opacity-0 hover:opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Chat with LawBrain
            <div className="absolute bottom-0 right-4 translate-y-1/2 w-2 h-2 bg-brown-900 rotate-45" />
          </div>
        )}

        <button
          onClick={() => {
            setOpen(v => !v)
            setMinimized(false)
          }}
          className="relative w-14 h-14 rounded-full bg-brown-700 hover:bg-brown-800 text-brown-50 shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center group hover:scale-105 active:scale-95"
          aria-label={open ? 'Close chat' : 'Open LawBrain chat'}
        >
          {open
            ? <X className="w-6 h-6 transition-transform duration-200" />
            : <MessageCircle className="w-6 h-6 transition-transform duration-200 group-hover:scale-110" />
          }

          {/* Notification dot */}
          {!open && (
            <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-amber-500 border-2 border-white rounded-full shadow-sm" />
          )}
        </button>

        {/* Label bubble (only visible when closed) */}
        {!open && (
          <div className="absolute bottom-1 right-16 bg-brown-800 text-brown-100 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap animate-fade-in pointer-events-none">
            Chat with LawBrain ⚖
          </div>
        )}
      </div>
    </>
  )
}
