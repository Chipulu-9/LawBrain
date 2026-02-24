import { useState } from 'react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'

type LocationState = {
  from?: {
    pathname?: string
  }
  message?: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const state = (location.state ?? {}) as LocationState
  const destination = state.from?.pathname ?? '/chatbot'
  const message = state.message ?? 'Please sign in to continue'

  async function handleGoogleSignIn() {
    setError(null)
    setIsSigningIn(true)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      navigate(destination, { replace: true })
    } catch {
      setError('Sign-in failed. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-brown-50/50">
      <div className="w-full max-w-md bg-white border border-brown-200 rounded-2xl shadow-lg p-8 text-center">
        <h1 className="font-serif text-3xl font-800 text-brown-950 mb-3">Sign In</h1>
        <p className="text-brown-700 text-sm mb-6">{message}</p>

        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-brown-700 hover:bg-brown-800 disabled:opacity-50 text-brown-50 text-sm font-semibold rounded-xl transition-colors"
        >
          {isSigningIn ? 'Signing in...' : 'Continue with Google'}
        </button>

        {error && <p className="text-sm text-red-700 mt-4">{error}</p>}
      </div>
    </section>
  )
}
