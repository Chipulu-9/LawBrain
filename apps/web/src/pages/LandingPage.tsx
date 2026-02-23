import { useState } from 'react'
import {
  Search,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  FileText,
  Sparkles,
  ShieldCheck,
  Scale,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { AuthModal } from '../components/AuthModal'

/* ─── Small reusable pieces ─────────────────────────────────────── */

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType
  title: string
  description: string
  color: string
}) {
  return (
    <div className="group relative bg-white border border-brown-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer focus-within:ring-2 focus-within:ring-brown-400 focus-within:ring-offset-2 focus-within:outline-none">
      {/* Subtle background accent */}
      <div
        className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -mr-8 -mt-8 ${color}`}
      />
      <div
        className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 transition-transform duration-200 group-hover:scale-110 ${color}`}
      >
        <Icon className="w-6 h-6 text-white" strokeWidth={1.8} />
      </div>
      <h3 className="font-serif text-lg font-700 text-brown-900 mb-2">{title}</h3>
      <p className="text-sm text-brown-600 leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="group flex gap-5 p-4 rounded-xl hover:bg-brown-50 transition-all duration-200">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brown-700 text-brown-50 flex items-center justify-center font-serif font-bold text-lg shadow-md transition-all duration-200 group-hover:bg-brown-800 group-hover:scale-105">
        {step}
      </div>
      <div className="pt-1">
        <h3 className="font-serif font-700 text-brown-900 text-lg mb-1">{title}</h3>
        <p className="text-sm text-brown-600 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-4 rounded-xl hover:scale-105 hover:shadow-xl transition-all duration-200">
      <div className="font-serif text-4xl font-800 text-brown-800 mb-1">{value}</div>
      <div className="text-sm text-brown-500 font-medium uppercase tracking-wide">{label}</div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────── */

export function LandingPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  /** Opens the chatbot for authenticated users; prompts sign-up otherwise. */
  function openChat(q = '') {
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    window.dispatchEvent(new CustomEvent('lawbrain-open-chat', { detail: { query: q } }))
  }

  function handleSearch() {
    const q = query.trim()
    if (!q || searching) return
    setSearching(true)
    openChat(q)
    setTimeout(() => setSearching(false), 400)
  }

  const exampleQueries = [
    'What does the constitution say about freedom of speech?',
    'How are land rights defined in Zambian law?',
    'What are the rights of an accused person?',
    'Tell me about the Zambian diplomatic service act',
  ]

  return (
    <>
    <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultMode="signup" />
    <div className="w-full">
      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section className={`relative overflow-hidden parchment-pattern ${user ? 'pt-20 pb-24 md:pt-28 md:pb-32' : 'min-h-[calc(100vh-4rem)] flex items-center'}`}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-0 w-72 h-72 bg-brown-300 rounded-full opacity-10 blur-3xl -translate-x-1/2" />
          <div className="absolute top-1/3 right-0 w-96 h-96 bg-amber-400 rounded-full opacity-8 blur-3xl translate-x-1/3" />
          <div className="absolute bottom-0 left-1/2 w-[600px] h-64 bg-brown-200 rounded-full opacity-20 blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brown-100 border border-brown-300 text-brown-700 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            AI-Powered · Zambian Law · Cited Sources
          </div>

          {/* Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-800 text-brown-950 leading-[1.05] tracking-tight mb-6">
            Your AI Legal Guide
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-brown-700">for Zambian Law</span>
              {/* Underline accent */}
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 400 12"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 9 Q100 2 200 8 Q300 14 398 5"
                  stroke="#c4722a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.6"
                />
              </svg>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-brown-600 max-w-2xl mx-auto leading-relaxed mb-12">
            Ask questions about the Zambian Constitution, Acts and Statutes in plain language. Every
            answer is grounded in official legal documents with cited references you can verify.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white border-2 border-brown-300 rounded-2xl shadow-lg hover:border-brown-500 focus-within:border-brown-700 focus-within:shadow-xl transition-all duration-200">
              <Search className="absolute left-4 w-5 h-5 text-brown-400 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Ask a legal question in plain English…"
                className="flex-1 bg-transparent pl-12 pr-4 py-4 text-brown-900 placeholder-brown-400 text-base outline-none rounded-2xl"
                aria-label="Ask a legal question"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className="flex-shrink-0 m-1.5 px-5 py-2.5 bg-brown-700 hover:bg-brown-800 text-brown-50 text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                aria-label="Ask LawBrain"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <>
                    Ask LawBrain
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Example queries */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {exampleQueries.slice(0, 3).map(q => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="px-3 py-1.5 text-xs font-medium text-brown-600 bg-brown-100 border border-brown-200 rounded-full hover:bg-brown-200 hover:text-brown-800 hover:-translate-y-0.5 transition-all duration-200 truncate max-w-[220px] cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 active:scale-95"
                  aria-label={`Example: ${q.slice(0, 50)}`}
                >
                  "{q.slice(0, 38)}…"
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {user && <>
      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <section className="bg-brown-800 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value="2,300+" label="Legal Chunks Indexed" />
            <StatCard value="12" label="Acts & Statutes" />
            <StatCard value="100%" label="Source Cited" />
            <StatCard value="< 3s" label="Answer Speed" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════ */}
      <section id="features" className="py-20 md:py-28 bg-brown-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brown-600 bg-brown-100 rounded-full border border-brown-200 mb-4">
              Why LawBrain
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-800 text-brown-950 mb-4">
              Built for Zambian Legal Research
            </h2>
            <p className="text-brown-600 max-w-xl mx-auto text-base">
              Combining the precision of a legal library with the accessibility of a conversation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={MessageSquare}
              title="Conversational AI"
              description="Ask questions in plain English — no legal jargon required. LawBrain understands context and follows up naturally."
              color="bg-brown-700"
            />
            <FeatureCard
              icon={FileText}
              title="Cited Sources"
              description="Every answer links directly to the specific section of the law it's drawn from. Verify, explore and build confidence."
              color="bg-amber-600"
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Accurate & Grounded"
              description="Powered by Firestore Vector Search + Gemini. Answers are semantically matched to the most relevant legal text."
              color="bg-brown-600"
            />
            <FeatureCard
              icon={BookOpen}
              title="Full Legal Corpus"
              description="Covers the Constitution, Laws of Zambia Volume 1, Diplomatic Acts, and more — continuously expanding."
              color="bg-brown-800"
            />
            <FeatureCard
              icon={Search}
              title="Semantic Search"
              description="Finds what you mean, not just what you type. Vector embeddings capture the intent behind your question."
              color="bg-amber-700"
            />
            <FeatureCard
              icon={Scale}
              title="Neutral & Objective"
              description="LawBrain presents the law as written — no interpretation bias. A tool for understanding, not advocacy."
              color="bg-brown-700"
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left — Steps */}
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brown-600 bg-brown-100 rounded-full border border-brown-200 mb-6">
                How It Works
              </span>
              <h2 className="font-serif text-4xl md:text-5xl font-800 text-brown-950 mb-10 leading-tight">
                From question to
                <br />
                cited answer in seconds
              </h2>
              <div className="space-y-8">
                <StepCard
                  step={1}
                  title="Ask your question"
                  description="Type your legal question in everyday language. No need for section numbers or act names."
                />
                <StepCard
                  step={2}
                  title="AI searches the corpus"
                  description="LawBrain converts your question to a vector embedding and finds the most semantically relevant sections across all Zambian legal documents."
                />
                <StepCard
                  step={3}
                  title="Get a grounded answer"
                  description="Gemini generates a clear, concise answer using the retrieved legal text as context — with exact citations you can click to verify."
                />
              </div>
            </div>

            {/* Right — Visual card mockup */}
            <div className="relative">
              <div className="bg-brown-50 border border-brown-200 rounded-2xl shadow-xl p-6 space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-brown-700 text-brown-50 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm leading-relaxed shadow">
                    What rights does an accused person have before trial?
                  </div>
                </div>

                {/* AI response */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brown-800 flex items-center justify-center text-brown-100 font-serif font-bold text-xs shadow">
                    ⚖
                  </div>
                  <div className="bg-white border border-brown-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-brown-800 leading-relaxed shadow-sm max-w-[85%]">
                    <p className="mb-2">
                      Under <strong>Article 18 of the Constitution of Zambia</strong>, every person
                      charged with a criminal offence has the right to:
                    </p>
                    <ul className="space-y-1 text-xs text-brown-700 pl-3">
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />{' '}
                        Be presumed innocent until proven guilty
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />{' '}
                        Be informed of the charge in a language they understand
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />{' '}
                        Have adequate time to prepare a defence
                      </li>
                    </ul>
                    {/* Source badges */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-semibold border border-amber-200">
                        <FileText className="w-3 h-3" /> Constitution Art. 18
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brown-100 text-brown-700 rounded-full text-[10px] font-semibold border border-brown-200">
                        <FileText className="w-3 h-3" /> Laws Vol. 1 §42
                      </span>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="flex items-center gap-2 mt-2 pt-3 border-t border-brown-100">
                  <input
                    type="text"
                    readOnly
                    placeholder="Ask a follow-up question…"
                    className="flex-1 bg-brown-100 rounded-xl px-4 py-2.5 text-xs text-brown-400 italic placeholder-brown-400 border border-transparent focus:bg-white focus:border-brown-300 outline-none transition-all duration-200 cursor-default"
                    aria-hidden
                  />
                  <button
                    className="p-2 bg-brown-700 hover:bg-brown-800 rounded-xl text-brown-100 shadow-sm transition-all duration-200 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 active:scale-95"
                    aria-label="Send follow-up"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg rotate-3">
                Live Preview
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LEGAL CORPUS
      ══════════════════════════════════════════ */}
      <section id="corpus" className="py-20 md:py-28 bg-brown-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brown-600 bg-brown-100 rounded-full border border-brown-200 mb-4">
            Legal Corpus
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-800 text-brown-950 mb-4">
            Grounded in Official Zambian Law
          </h2>
          <p className="text-brown-600 max-w-xl mx-auto mb-12">
            LawBrain's knowledge base is built from official, government-published legal documents —
            not third-party summaries.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              { title: 'Constitution of Zambia', sections: '128 Articles', type: 'Constitution' },
              {
                title: 'Laws of Zambia — Volume 1',
                sections: '1,200+ sections',
                type: 'Compiled Legislation',
              },
              { title: 'Zambia Institute of Diplomacy Act', sections: '42 sections', type: 'Act' },
              { title: 'More Acts — Coming Soon', sections: 'In progress', type: 'Expanding' },
            ].map(doc => (
              <button
                key={doc.title}
                type="button"
                onClick={() => openChat(`Tell me about ${doc.title}`)}
                onKeyDown={e => e.key === ' ' && e.preventDefault()}
                className="group w-full flex items-start gap-4 bg-white border border-brown-200 rounded-xl p-4 shadow-sm text-left hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2"
                aria-label={`Learn more about ${doc.title}`}
              >
                <div className="flex-shrink-0 w-10 h-10 bg-brown-100 rounded-lg flex items-center justify-center border border-brown-200 transition-all duration-200">
                  <Scale className="w-5 h-5 text-brown-700 group-hover:text-brown-800 group-hover:scale-110 transition-all duration-200" />
                </div>
                <div>
                  <div className="font-serif font-700 text-brown-900 text-sm leading-tight">
                    {doc.title}
                  </div>
                  <div className="text-xs text-brown-500 mt-0.5">{doc.sections}</div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-brown-100 text-brown-600 rounded-full border border-brown-200">
                    {doc.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════ */}
      <section className="brown-gradient py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 mx-auto mb-6 bg-brown-600/50 rounded-2xl flex items-center justify-center border border-brown-500">
            <Scale className="w-7 h-7 text-brown-100" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-800 text-brown-50 mb-4 leading-tight">
            Start your legal
            <br />
            journey today
          </h2>
          <p className="text-brown-300 text-base mb-10 max-w-md mx-auto">
            Create a free account and start asking questions about Zambian law instantly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => openChat()}
              className="inline-flex items-center gap-2 px-8 py-4 bg-brown-50 text-brown-900 font-semibold text-sm rounded-xl shadow-lg hover:bg-white transition-all duration-200 hover:shadow-xl cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-300 focus-visible:ring-offset-2 active:scale-95"
              aria-label="Ask a question"
            >
              Ask a Question
              <ChevronRight className="w-4 h-4" />
            </button>
            <a
              href="#corpus"
              className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-brown-200 border border-brown-500 font-medium text-sm rounded-xl hover:bg-brown-700 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 active:scale-95"
              aria-label="View legal corpus"
            >
              View Legal Corpus
            </a>
          </div>
        </div>
      </section>
      </>}
    </div>
    </>
  )
}
