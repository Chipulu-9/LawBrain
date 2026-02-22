import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { ChatbotWidget } from './components/ChatbotWidget'
import { LandingPage } from './pages/LandingPage'
import './style.css'

export function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-background">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
            </Routes>
          </main>
          <Footer />
          <ChatbotWidget />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
