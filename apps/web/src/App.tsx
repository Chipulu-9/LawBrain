import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { ChatbotWidget } from './components/ChatbotWidget'
import { LandingPage } from './pages/LandingPage'
import { trpc, trpcClient } from './lib/trpc'
import './style.css'

const queryClient = new QueryClient()

export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </trpc.Provider>
  )
}
