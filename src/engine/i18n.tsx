/**
 * i18n — the manifest emits KEYS only (res.*, field.*, enum.*, action.*,
 * group.*). The project supplies translation dictionaries; missing keys fall
 * back to a humanized last segment so the UI never shows a raw key.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Dictionary = Record<string, string>
export type Dictionaries = Record<string, Dictionary>

interface I18nContextValue {
  locale: string
  locales: string[]
  setLocale: (l: string) => void
  t: (key?: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function humanize(key: string): string {
  const last = key.split('.').pop() ?? key
  return last
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase())
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

// Module-level mirror of the active translate fn, kept in sync by the provider.
// Lets non-React code (data provider, notification provider) localize keys without
// a hook. Falls back to humanizing the key when no provider is mounted yet.
let activeTranslate: I18nContextValue['t'] = (key) => (key ? humanize(key) : '')

/** Translate a key outside the React tree (uses the active locale's dictionary). */
export function translate(key?: string, vars?: Record<string, string | number>): string {
  return activeTranslate(key, vars)
}

export interface I18nProviderProps {
  dictionaries: Dictionaries
  defaultLocale: string
  locales: string[]
  children: ReactNode
}

export function I18nProvider({
  dictionaries,
  defaultLocale,
  locales,
  children
}: I18nProviderProps) {
  const [locale, setLocale] = useState(defaultLocale)

  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale] ?? {}
    return {
      locale,
      locales,
      setLocale,
      t: (key, vars) => {
        if (!key) return ''
        const raw = dict[key] ?? dictionaries[defaultLocale]?.[key]
        return interpolate(raw ?? humanize(key), vars)
      }
    }
  }, [dictionaries, locale, locales, defaultLocale])

  // Mirror the active translate fn for non-React consumers (see `translate`).
  useEffect(() => {
    activeTranslate = value.t
    return () => {
      activeTranslate = (key) => (key ? humanize(key) : '')
    }
  }, [value])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}

/** Convenience hook returning just the translate function. */
export function useT() {
  return useI18n().t
}

/**
 * Engine-shipped base translations (lowest priority — projects override any key).
 * Covers the strings the engine itself emits outside the manifest, notably the
 * humanized backend error messages (see providers/errors.ts).
 */
export const defaultDictionaries: Dictionaries = {
  en: {
    'error.unique': 'This value already exists.',
    'error.reference': 'This item is still linked to other records.',
    'error.required': 'A required field is missing.',
    'error.forbidden': 'You are not allowed to perform this action.',
    'error.notFound': 'Not found.',
    'error.conflict': 'The change could not be applied (conflict).',
    'error.generic': 'Something went wrong. Please try again.',
    'meta.id': 'ID',
    'meta.createdAt': 'Created',
    'meta.updatedAt': 'Updated',
    'action.copy': 'Copy',
    'action.remove': 'Remove',
    'badge.featured': 'Featured',
    'upload.button': 'Upload',
    'upload.hint': 'Drop an image or click Upload',
    'upload.dropHint': 'or drag & drop images here',
    'upload.saveFirst': 'Save the record first to upload images',
    'upload.tooLarge': 'File too large',
    'upload.failed': 'Upload failed',
    'upload.cover': 'cover',
    'upload.alt': 'alt text',
    'sort.by': 'Sort by',
    'sort.asc': 'Ascending',
    'sort.desc': 'Descending',
    'filter.title': 'Filters',
    'filter.clear': 'Clear',
    'filter.any': 'Any',
    'filter.yes': 'Yes',
    'filter.no': 'No',
    'filter.min': 'Min',
    'filter.max': 'Max'
  },
  it: {
    'error.unique': 'Valore già presente.',
    'error.reference': 'Elemento ancora collegato ad altri record.',
    'error.required': 'Manca un campo obbligatorio.',
    'error.forbidden': 'Operazione non consentita.',
    'error.notFound': 'Elemento non trovato.',
    'error.conflict': 'Modifica non applicabile (conflitto).',
    'error.generic': 'Si è verificato un errore. Riprova.',
    'meta.id': 'ID',
    'meta.createdAt': 'Creato',
    'meta.updatedAt': 'Aggiornato',
    'action.copy': 'Copia',
    'action.remove': 'Rimuovi',
    'badge.featured': 'In evidenza',
    'upload.button': 'Carica',
    'upload.hint': "Trascina un'immagine o clicca Carica",
    'upload.dropHint': 'oppure trascina qui le immagini',
    'upload.saveFirst': 'Salva prima il record per caricare le immagini',
    'upload.tooLarge': 'File troppo grande',
    'upload.failed': 'Caricamento fallito',
    'upload.cover': 'copertina',
    'upload.alt': 'testo alternativo',
    'sort.by': 'Ordina per',
    'sort.asc': 'Crescente',
    'sort.desc': 'Decrescente',
    'filter.title': 'Filtri',
    'filter.clear': 'Pulisci',
    'filter.any': 'Tutti',
    'filter.yes': 'Sì',
    'filter.no': 'No',
    'filter.min': 'Min',
    'filter.max': 'Max'
  }
}
