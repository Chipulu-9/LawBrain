import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { FloatingChatButton } from './components/FloatingChatButton'
import { LandingPage } from './pages/LandingPage'
import { ChatbotPage } from './pages/ChatbotPage'
import { LoginPage } from './pages/LoginPage'
import './style.css'
import type { ReactNode } from 'react'

/** Redirects unauthenticated users to the landing page. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-brown-700">
        Checking authentication...
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppShell() {
  const location = useLocation()
  const isChatbotRoute = location.pathname === '/chatbot'

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {!isChatbotRoute && <Navbar />}
      <main className={isChatbotRoute ? 'h-screen' : 'flex-1'}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <ChatbotPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
      {!isChatbotRoute && <Footer />}
      {!isChatbotRoute && <FloatingChatButton />}
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
