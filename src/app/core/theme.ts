import { environment } from '../../environments/environment';

const THEME_KEY = 'mb-theme';

export type Theme = 'dark' | 'light';

/** The visitor's explicit choice from the theme toggle, if they made one. */
export function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export const lightQuery = () => window.matchMedia('(prefers-color-scheme: light)');

/** An explicit choice from the toggle wins; otherwise environment.defaultTheme. */
export function resolveTheme(): Theme {
  const fallback = environment.defaultTheme;
  if (fallback !== 'system') return storedTheme() ?? fallback;
  return storedTheme() ?? (lightQuery().matches ? 'light' : 'dark');
}

/** Applied before first paint (main.ts) and again whenever the theme changes, so there's no flash. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('theme-light', theme === 'light');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f0e8' : '#050505');
}

export function saveTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this page view.
  }
}
