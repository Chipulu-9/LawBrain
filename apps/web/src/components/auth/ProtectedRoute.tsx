import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute() {
  const { user, isLoading, error } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-brown-700 gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-brown-300 border-t-brown-700 animate-spin" />
        <p>Checking authentication...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-5 text-center shadow-sm">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          message: 'Please sign in to access the chatbot',
        }}
      />
    )
  }

  return <Outlet />
}
