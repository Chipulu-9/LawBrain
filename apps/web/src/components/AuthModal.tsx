import { useState, useEffect, useRef } from 'react'
import { X, Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../lib/authErrors'
import toast from 'react-hot-toast'

type Mode = 'signin' | 'signup' | 'forgot'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  defaultMode?: Mode
}

/* Google G logo SVG */
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function AuthModal({ open, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const { signUp, signIn, signInWithGoogle, resetPassword, setError } = useAuth()
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [inlineError, setInlineError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setMode(defaultMode)
      setForm({ displayName: '', email: '', password: '', confirmPassword: '' })
      setInlineError(null)
      setError(null)
    }
  }, [open, defaultMode, setError])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  function validate(): boolean {
    setInlineError(null)
    const { email, password, confirmPassword, displayName } = form
    const emailTrim = email.trim()
    if (!emailTrim) {
      setInlineError('Email is required.')
      return false
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(emailTrim)) {
      setInlineError('Please enter a valid email address.')
      return false
    }
    if (mode === 'forgot') return true
    if (mode === 'signup') {
      if (!displayName.trim()) {
        setInlineError('Full name is required.')
        return false
      }
      if (password.length < 6) {
        setInlineError('Password must be at least 6 characters.')
        return false
      }
      if (password !== confirmPassword) {
        setInlineError('Passwords do not match.')
        return false
      }
    } else {
      if (!password) {
        setInlineError('Password is required.')
        return false
      }
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || busy) return
    setBusy(true)
    setInlineError(null)
    try {
      if (mode === 'forgot') {
        await resetPassword(form.email.trim())
        toast.success('Check your email for a password reset link.')
        onClose()
        return
      }
      if (mode === 'signup') {
        await signUp(form.email.trim(), form.password, form.displayName.trim())
        toast.success('Account created. Welcome to LawBrain!')
        onClose()
        return
      }
      await signIn(form.email.trim(), form.password)
      toast.success('Signed in successfully.')
      onClose()
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
      const message = getErrorMessage(code)
      setInlineError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogleSignIn() {
    if (busy) return
    setBusy(true)
    setInlineError(null)
    try {
      await signInWithGoogle()
      toast.success('Signed in with Google.')
      onClose()
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
      const message = getErrorMessage(code)
      setInlineError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brown-950/50 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-brown-200 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-brown-500 hover:bg-brown-100 transition-all cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-10">
          <h2 id="auth-modal-title" className="font-serif text-2xl font-700 text-brown-950 mb-6">
            {mode === 'forgot'
              ? 'Reset password'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </h2>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-brown-200 text-brown-800 font-medium hover:bg-brown-50 hover:border-brown-300 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <span className="flex-1 h-px bg-brown-200" />
            <span className="text-sm text-brown-500">or</span>
            <span className="flex-1 h-px bg-brown-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-displayName"
                  className="block text-sm font-medium text-brown-700 mb-1"
                >
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-400" />
                  <input
                    id="auth-displayName"
                    type="text"
                    value={form.displayName}
                    onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-4 py-3 border-2 border-brown-200 rounded-xl text-brown-900 placeholder-brown-400 outline-none focus:border-brown-500 focus:ring-2 focus:ring-brown-200 transition-all"
                    autoComplete="name"
                    disabled={busy}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-brown-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-400" />
                <input
                  id="auth-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border-2 border-brown-200 rounded-xl text-brown-900 placeholder-brown-400 outline-none focus:border-brown-500 focus:ring-2 focus:ring-brown-200 transition-all"
                  autoComplete="email"
                  disabled={busy}
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-sm font-medium text-brown-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-400" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                    className="w-full pl-10 pr-12 py-3 border-2 border-brown-200 rounded-xl text-brown-900 placeholder-brown-400 outline-none focus:border-brown-500 focus:ring-2 focus:ring-brown-200 transition-all"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brown-500 hover:text-brown-700 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 rounded"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-confirmPassword"
                  className="block text-sm font-medium text-brown-700 mb-1"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-400" />
                  <input
                    id="auth-confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 border-2 border-brown-200 rounded-xl text-brown-900 placeholder-brown-400 outline-none focus:border-brown-500 focus:ring-2 focus:ring-brown-200 transition-all"
                    autoComplete="new-password"
                    disabled={busy}
                  />
                </div>
              </div>
            )}

            {inlineError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {inlineError}
              </p>
            )}

            {mode === 'signin' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm font-medium text-brown-600 hover:text-brown-800 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 rounded"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 px-4 rounded-xl bg-brown-700 text-brown-50 font-semibold hover:bg-brown-800 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                  Please wait…
                </>
              ) : mode === 'forgot' ? (
                'Send reset link'
              ) : mode === 'signup' ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-brown-600">
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-medium text-brown-700 hover:text-brown-900 underline outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 rounded"
              >
                Back to sign in
              </button>
            ) : mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-medium text-brown-700 hover:text-brown-900 underline outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 rounded"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-medium text-brown-700 hover:text-brown-900 underline outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 rounded"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
