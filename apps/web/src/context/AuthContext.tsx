import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
  createdAt: unknown
  updatedAt: unknown
  plan: 'free'
  questionsAsked: number
  savedQueries: unknown[]
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  isLoading: boolean
  error: string | null
  setError: (err: string | null) => void
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_PROFILE_DEFAULTS = {
  plan: 'free' as const,
  questionsAsked: 0,
  savedQueries: [],
}

async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  photoURL: string | null
) {
  const ref = doc(db, 'users', uid)
  await setDoc(ref, {
    uid,
    email,
    displayName: displayName || '',
    photoURL: photoURL ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...USER_PROFILE_DEFAULTS,
  })
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u ?? null)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setError(null)
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() })
    }
    await createUserProfile(
      cred.user.uid,
      cred.user.email ?? email,
      displayName.trim() || (cred.user.displayName ?? ''),
      cred.user.photoURL ?? null
    )
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    await firebaseSignOut(auth)
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const { uid, email, displayName, photoURL } = result.user
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await createUserProfile(uid, email ?? '', displayName ?? '', photoURL ?? null)
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setError(null)
    await sendPasswordResetEmail(auth, email)
  }, [])

  const value: AuthContextValue = {
    user,
    loading,
    isLoading: loading,
    error,
    setError,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

export const useAuthContext = useAuth
