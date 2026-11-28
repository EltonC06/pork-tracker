export const THEME_COOKIE = 'pork-theme'
export type ThemePreference = 'light' | 'dark' | 'system'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function parseThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : 'system'
}
