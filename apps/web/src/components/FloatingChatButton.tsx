import { MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function FloatingChatButton() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  function handleClick() {
    if (loading) return

    if (user) {
      navigate('/chatbot')
      return
    }

    navigate('/login', {
      state: {
        from: { pathname: '/chatbot' },
        message: 'Please sign in to access the chatbot',
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Open chatbot"
      className="fixed bottom-5 right-5 z-[100] w-14 h-14 rounded-full bg-brown-700 hover:bg-brown-800 text-brown-50 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
      disabled={loading}
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  )
}
