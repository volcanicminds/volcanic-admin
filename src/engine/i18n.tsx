/**
 * i18n — the manifest emits KEYS only (res.*, field.*, enum.*, action.*,
 * group.*). The project supplies translation dictionaries; missing keys fall
 * back to a humanized last segment so the UI never shows a raw key.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

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
