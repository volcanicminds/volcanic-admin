/**
 * Theme — light/dark/system preference, persisted client-side in localStorage
 * (device preference, not a synced user setting). Applies the `.dark` class on
 * <html> so the dark token block in globals.css (and any per-project dark
 * overrides injected by <ThemeStyle/>) takes effect. `system` follows the OS
 * via matchMedia and reacts to live changes.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'volcanic.admin.theme'
const MODES: ThemeMode[] = ['light', 'dark', 'system']

interface ThemeValue {
  /** The user's choice: light, dark, or system. */
  mode: ThemeMode
  /** The actually-applied theme once `system` is resolved. */
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeValue>({
  mode: 'system',
  resolved: 'light',
  setMode: () => {}
})

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStored(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system'
  const v = localStorage.getItem(STORAGE_KEY)
  return MODES.includes(v as ThemeMode) ? (v as ThemeMode) : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStored)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    (mode === 'system' ? systemPrefersDark() : mode === 'dark') ? 'dark' : 'light'
  )

  useEffect(() => {
    const apply = () => {
      const dark = mode === 'system' ? systemPrefersDark() : mode === 'dark'
      document.documentElement.classList.toggle('dark', dark)
      setResolved(dark ? 'dark' : 'light')
    }
    apply()

    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [mode])

  const setMode = (next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next)
    setModeState(next)
  }

  return <ThemeContext.Provider value={{ mode, resolved, setMode }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
