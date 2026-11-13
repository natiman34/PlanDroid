export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

/**
 * Resolve the effective visual theme ('dark' or 'light') from user preference and OS color scheme.
 */
export function resolveAppliedTheme(
  preference: ThemePreference | undefined,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return 'dark';
}

/**
 * Apply theme classes and browser theme-color metadata to document root.
 */
export function applyThemeToDocument(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
  root.setAttribute('data-theme', resolved);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolved === 'light' ? '#f1f5f9' : '#0f172a');
  }
}
