import { useState, useRef, useEffect } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useLanguage } from '../hooks/useLanguage'
import { AVAILABLE_LANGUAGES } from '../contexts/LanguageContext'
import type { Locale } from '../contexts/LanguageContext'

interface LanguageSwitcherProps {
  compact?: boolean
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, isLoading } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = AVAILABLE_LANGUAGES.find(l => l.code === locale) ?? AVAILABLE_LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <select
          value={locale}
          onChange={e => setLocale(e.target.value as Locale)}
          disabled={isLoading}
          aria-label="Select language"
          className="flex-1 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 cursor-pointer"
        >
          {AVAILABLE_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.nativeName}
              {lang.code !== 'en' ? ` (${lang.name})` : ''}
            </option>
          ))}
        </select>
        {isLoading && (
          <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 transition-all duration-200 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Globe className="w-4 h-4 text-amber-600" />
        )}
        <span className="hidden sm:inline font-medium">{current.nativeName}</span>
        <span className="text-base leading-none">{current.flag}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-amber-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Available languages"
          className="absolute right-0 mt-2 w-52 bg-white border border-amber-200 rounded-lg shadow-lg py-1 z-50 animate-fade-in"
        >
          <p className="px-3 py-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wide">
            Select Language
          </p>
          {AVAILABLE_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              role="option"
              aria-selected={locale === lang.code}
              onClick={() => {
                setLocale(lang.code as Locale)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150 ${
                locale === lang.code
                  ? 'bg-amber-50 text-amber-900'
                  : 'text-stone-700 hover:bg-amber-50'
              }`}
            >
              <span className="text-base leading-none w-5 flex-shrink-0">{lang.flag}</span>
              <div className="flex-1 text-left">
                <span className="font-medium">{lang.nativeName}</span>
                {lang.code !== 'en' && (
                  <span className="ml-1.5 text-xs text-stone-500">({lang.name})</span>
                )}
              </div>
              {locale === lang.code && <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
