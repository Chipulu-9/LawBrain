const DETECT_API_URL = 'https://ws.detectlanguage.com/0.2/detect'
const DETECT_API_KEY = import.meta.env.VITE_DETECT_LANGUAGE_API_KEY as string | undefined

interface Detection {
  language: string
  isReliable: boolean
  confidence: number
}

interface DetectResponse {
  data: {
    detections: Detection[]
  }
}

/**
 * Detect the language of a text string.
 * Returns an ISO 639-1 language code, defaulting to 'en' on any failure.
 */
export async function detectLanguage(text: string): Promise<string> {
  if (text.trim().length < 3) return 'en'
  if (!DETECT_API_KEY) return 'en'

  try {
    const res = await fetch(DETECT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DETECT_API_KEY}`,
      },
      body: JSON.stringify({ q: text }),
    })

    if (!res.ok) {
      console.error('[detectLanguage] API error:', res.status)
      return 'en'
    }

    const data: DetectResponse = await res.json()
    const detection = data.data.detections[0]

    if (detection && detection.isReliable && detection.confidence > 5) {
      return detection.language
    }

    return 'en'
  } catch (err) {
    console.error('[detectLanguage] fetch error:', err)
    return 'en'
  }
}

/**
 * Map a raw ISO 639-1 code from DetectLanguage to one of our supported
 * Locale codes. Falls back to 'en' for unsupported languages.
 */
export function mapToSupportedLocale(detectedCode: string): string {
  const map: Record<string, string> = {
    en: 'en',
    bem: 'bem', // Bemba
    nya: 'nya', // Nyanja
    toi: 'toi', // Tonga
    ny: 'nya',  // Chichewa/Nyanja alternate ISO code
  }
  return map[detectedCode] ?? 'en'
}
