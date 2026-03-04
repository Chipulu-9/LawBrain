import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

// Prevent real Firebase initialization
vi.mock('./lib/firebase', () => ({
  auth: {},
  db: {},
  default: {},
}))

// Mock Firebase Auth — resolve onAuthStateChanged immediately as logged-out
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: null) => void) => {
    callback(null)
    return vi.fn() // unsubscribe noop
  }),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
}))

// Mock Firestore — prevent any real DB calls
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  serverTimestamp: vi.fn(() => new Date()),
  collection: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  query: vi.fn(),
  orderBy: vi.fn(),
}))

// Mock tRPC — trpc.Provider just renders children; no HTTP calls
vi.mock('./lib/trpc', () => ({
  trpc: {
    Provider: ({ children }: { children: unknown }) => children,
  },
  trpcClient: {},
}))

describe('App', () => {
  it('renders the LawBrain header', () => {
    render(<App />)
    expect(screen.getByLabelText('LawBrain home')).toBeInTheDocument()
  })

  it('renders the main heading', () => {
    render(<App />)
    expect(screen.getByText(/Your AI Legal Guide/i)).toBeInTheDocument()
  })

  it('renders the navigation links', () => {
    render(<App />)
    expect(screen.getByLabelText('How it works section')).toBeInTheDocument()
    expect(screen.getByLabelText('Features section')).toBeInTheDocument()
  })
})
