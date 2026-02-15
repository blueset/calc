import { useEffect, useMemo, useSyncExternalStore } from 'react'

type ThemeSetting = 'light' | 'dark' | 'system'

const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
function subscribeToDarkMode(callback: () => void) {
  darkMq.addEventListener('change', callback)
  return () => darkMq.removeEventListener('change', callback)
}
function getDarkModeSnapshot(): 'light' | 'dark' {
  return darkMq.matches ? 'dark' : 'light'
}

/**
 * Resolves the theme setting to an actual 'light' | 'dark' value,
 * listens to system preference changes, and applies the `dark` / `light`
 * class on `document.documentElement` (as required by shadcn/ui CSS variables).
 */
export function useTheme(themeSetting: ThemeSetting): 'light' | 'dark' {
  const systemTheme = useSyncExternalStore(subscribeToDarkMode, getDarkModeSnapshot)

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
