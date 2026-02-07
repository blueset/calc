import { useEffect, useMemo, useState } from 'react'

type ThemeSetting = 'light' | 'dark' | 'system'

/**
 * Resolves the theme setting to an actual 'light' | 'dark' value,
 * listens to system preference changes, and applies the `dark` / `light`
 * class on `document.documentElement` (as required by shadcn/ui CSS variables).
 */
export function useTheme(themeSetting: ThemeSetting): 'light' | 'dark' {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  // Track live system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolved = useMemo<'light' | 'dark'>(() => {
    if (themeSetting === 'system') return systemTheme
    return themeSetting
  }, [themeSetting, systemTheme])

  // Apply the class to <html> so shadcn CSS variables activate
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
  }, [resolved])

  return resolved
}
