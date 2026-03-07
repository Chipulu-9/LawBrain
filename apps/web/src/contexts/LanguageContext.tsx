import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

export type Locale = 'en' | 'bem' | 'nya' | 'toi'

export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'bem', name: 'Bemba', nativeName: 'Ichibemba', flag: '🇿🇲' },
  { code: 'nya', name: 'Nyanja', nativeName: 'Chinyanja', flag: '🇿🇲' },
  { code: 'toi', name: 'Tonga', nativeName: 'Chitonga', flag: '🇿🇲' },
] as const

const DEFAULT_TRANSLATIONS: Record<string, string> = {
  'app.title': 'LawBrain',
  'app.tagline': 'Your AI Legal Assistant for Zambian Law',
  'nav.home': 'Home',
  'nav.chat': 'Chat',
  'nav.history': 'History',
  'nav.settings': 'Settings',
  'chat.title': 'Ask about Zambian Law',
  'chat.placeholder': 'Type your legal question...',
  'chat.send': 'Send',
  'chat.thinking': 'Thinking...',
  'chat.error': 'Something went wrong. Please try again.',
  'chat.welcome':
    "Hello! I'm here to help you understand Zambian law. What would you like to know?",
  'chat.disclaimer':
    'This is AI-generated information, not legal advice. Consult a lawyer for specific cases.',
  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'auth.signup': 'Sign Up',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'common.loading': 'Loading...',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.confirm': 'Confirm',
  'language.select': 'Select Language',
  'language.current': 'Current Language',
}

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, fallback?: string) => string
  isLoading: boolean
  translateText: (text: string, targetLocale?: Locale) => Promise<string>
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const LANGUAGE_API_URL = import.meta.env.VITE_LANGUAGE_API_URL as string | undefined

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('lawbrain-locale')
    return (stored as Locale) || 'en'
  })
  const [translations, setTranslations] =
    useState<Record<string, string>>(DEFAULT_TRANSLATIONS)
  const [isLoading, setIsLoading] = useState(false)

  const fetchTranslations = useCallback(async (targetLocale: Locale) => {
    if (targetLocale === 'en' || !LANGUAGE_API_URL) {
      setTranslations(DEFAULT_TRANSLATIONS)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(LANGUAGE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_locale: 'en',
          target_locale: targetLocale,
          content_type: 'ui',
          texts: DEFAULT_TRANSLATIONS,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        locale: string
        translations: Record<string, string>
      }
      setTranslations(data.translations)
    } catch {
      setTranslations(DEFAULT_TRANSLATIONS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale)
      localStorage.setItem('lawbrain-locale', newLocale)
      document.documentElement.lang = newLocale
      fetchTranslations(newLocale)
    },
    [fetchTranslations]
  )

  // On mount: apply stored locale
  useEffect(() => {
    document.documentElement.lang = locale
    if (locale !== 'en') fetchTranslations(locale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = useCallback(
    (key: string, fallback?: string) =>
      translations[key] ?? fallback ?? DEFAULT_TRANSLATIONS[key] ?? key,
    [translations]
  )

  const translateText = useCallback(
    async (text: string, targetLocale?: Locale): Promise<string> => {
      const lang = targetLocale ?? locale
      if (lang === 'en' || !LANGUAGE_API_URL) return text
      try {
        const res = await fetch(LANGUAGE_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_locale: 'en',
            target_locale: lang,
            content_type: 'legal_response',
            texts: { response: text },
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as {
          locale: string
          translations: Record<string, string>
        }
        return data.translations['response'] ?? text
      } catch {
        return text
      }
    },
    [locale]
  )

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isLoading, translateText }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguageContext() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguageContext must be used within LanguageProvider')
  return ctx
}
