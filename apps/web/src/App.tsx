import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { ChatbotWidget } from './components/ChatbotWidget'
import { LandingPage } from './pages/LandingPage'
import './style.css'
import type { ReactNode } from 'react'

/** Redirects unauthenticated users to the landing page. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-background">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />

              {/* Protected — add authenticated pages here, e.g.:
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              */}
            </Routes>
          </main>
          <Footer />
          {/* ChatbotWidget internally checks auth and renders nothing when logged out */}
          <ChatbotWidget />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
