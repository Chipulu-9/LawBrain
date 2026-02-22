import { useState, useEffect, useRef } from 'react'
import { ChevronDown, LayoutDashboard, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!user) return null

  const displayName = user.displayName || user.email?.split('@')[0] || 'User'
  const initial = displayName.charAt(0).toUpperCase()
  const photoURL = user.photoURL

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 p-1.5 pr-2 rounded-xl hover:bg-brown-100 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-offset-2 active:scale-95"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-brown-700 text-brown-100 flex items-center justify-center font-serif font-bold text-sm overflow-hidden">
          {photoURL ? (
            <img src={photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <span className="hidden sm:block text-sm font-medium text-brown-800 max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-brown-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 py-2 bg-white rounded-xl border border-brown-200 shadow-xl animate-slide-up z-50"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-brown-100">
            <p className="font-medium text-brown-900 truncate">{displayName}</p>
            <p className="text-xs text-brown-500 truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <a
              href="#"
              className="flex items-center gap-2 px-4 py-2 text-sm text-brown-700 hover:bg-brown-50 transition-colors"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="w-4 h-4 text-brown-500" />
              Dashboard
            </a>
            <a
              href="#"
              className="flex items-center gap-2 px-4 py-2 text-sm text-brown-700 hover:bg-brown-50 transition-colors"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Settings className="w-4 h-4 text-brown-500" />
              Settings
            </a>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-brown-700 hover:bg-brown-50 transition-colors cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-400 focus-visible:ring-inset"
              role="menuitem"
            >
              <LogOut className="w-4 h-4 text-brown-500" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
