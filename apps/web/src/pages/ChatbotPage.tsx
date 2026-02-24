import { ChatbotWidget } from '../components/ChatbotWidget'

export function ChatbotPage() {
  return (
    <div className="min-h-[70vh] bg-brown-50/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-serif text-4xl font-800 text-brown-950 mb-4">LawBrain Chatbot</h1>
        <p className="text-brown-700 max-w-xl mx-auto">
          Ask legal questions and get grounded responses with source-aware context.
        </p>
      </div>
      <ChatbotWidget />
    </div>
  )
}
