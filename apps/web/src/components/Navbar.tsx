import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Scale, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { AuthModal } from './AuthModal'
import { UserMenu } from './UserMenu'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')
  const { user, loading } = useAuth()
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    function handleScroll() {
      const y = window.scrollY
      setHidden(y > lastScrollY.current && y > 80)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const openSignIn = () => {
    setAuthModalMode('signin')
    setAuthModalOpen(true)
  }
  const openSignUp = () => {
    setAuthModalMode('signup')
    setAuthModalOpen(true)
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b border-brown-200 bg-brown-50/95 backdrop-blur-sm shadow-sm transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 rounded-lg transition-all duration-200 active:scale-95"
              style={{ textDecoration: 'none' }}
              aria-label="LawBrain home"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brown-700 shadow-md group-hover:bg-brown-800 transition-colors">
                <Scale className="w-5 h-5 text-brown-100" strokeWidth={1.8} />
              </div>
              <div className="leading-tight">
                <span className="font-serif text-xl font-700 text-brown-900 tracking-tight">
                  LawBrain
                </span>
                <span className="hidden sm:block text-[10px] font-sans text-brown-500 tracking-wide uppercase -mt-0.5">
                  Zambia Legal AI
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <a
                href="#how-it-works"
                className="nav-link-underline text-sm font-medium text-brown-700 hover:text-brown-900 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 rounded px-1 py-0.5 active:scale-95"
                style={{ textDecoration: 'none' }}
                aria-label="How it works section"
              >
                How It Works
              </a>
              <a
                href="#features"
                className="nav-link-underline text-sm font-medium text-brown-700 hover:text-brown-900 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 rounded px-1 py-0.5 active:scale-95"
                style={{ textDecoration: 'none' }}
                aria-label="Features section"
              >
                Features
              </a>
              <a
                href="#corpus"
                className="nav-link-underline text-sm font-medium text-brown-700 hover:text-brown-900 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 rounded px-1 py-0.5 active:scale-95"
                style={{ textDecoration: 'none' }}
                aria-label="Legal corpus section"
              >
                Legal Corpus
              </a>
            </nav>

            {/* CTA / User */}
            <div className="hidden md:flex items-center gap-3">
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-20 rounded-lg bg-brown-200 animate-pulse" />
                  <div className="h-9 w-24 rounded-lg bg-brown-200 animate-pulse" />
                </div>
              ) : user ? (
                <UserMenu />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={openSignIn}
                    className="text-sm font-medium text-brown-700 hover:text-brown-900 px-3 py-1.5 rounded-md hover:bg-brown-100 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 active:scale-95"
                    aria-label="Sign in"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={openSignUp}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brown-700 text-brown-50 text-sm font-semibold hover:bg-brown-800 hover:shadow-lg transition-all duration-200 shadow-sm cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 active:scale-95"
                    aria-label="Get started"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-brown-600 hover:bg-brown-100 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 active:scale-95"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-brown-200 bg-brown-50 px-4 py-4 space-y-3 animate-slide-up">
            <a
              href="#how-it-works"
              className="block text-sm font-medium text-brown-700 hover:text-brown-900 py-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 rounded transition-all duration-200"
              style={{ textDecoration: 'none' }}
              onClick={() => setMobileOpen(false)}
              aria-label="How it works section"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="block text-sm font-medium text-brown-700 hover:text-brown-900 py-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 rounded transition-all duration-200"
              style={{ textDecoration: 'none' }}
              onClick={() => setMobileOpen(false)}
              aria-label="Features section"
            >
              Features
            </a>
            <a
              href="#corpus"
              className="block text-sm font-medium text-brown-700 hover:text-brown-900 py-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 rounded transition-all duration-200"
              style={{ textDecoration: 'none' }}
              onClick={() => setMobileOpen(false)}
              aria-label="Legal corpus section"
            >
              Legal Corpus
            </a>
            <div className="pt-2 flex flex-col gap-2">
              {loading ? (
                <div className="h-10 rounded-lg bg-brown-200 animate-pulse" />
              ) : user ? (
                <div className="py-2">
                  <UserMenu />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false)
                      openSignIn()
                    }}
                    className="text-center py-2 text-sm font-medium text-brown-700 border border-brown-300 rounded-lg cursor-pointer hover:bg-brown-100 outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 active:scale-95 transition-all duration-200"
                    aria-label="Sign in"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false)
                      openSignUp()
                    }}
                    className="text-center py-2 text-sm font-semibold text-brown-50 bg-brown-700 rounded-lg cursor-pointer hover:bg-brown-800 outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 active:scale-95 transition-all duration-200"
                    aria-label="Get started"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </>
  )
}
