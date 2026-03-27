import { STORAGE_KEY } from '@/config/storage-keys';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';

export type Theme = 'light' | 'dark';

export const DEFAULT_THEME: Theme = 'light';
export const LIGHT_THEME_COLOR = '#f6fbff';
export const DARK_THEME_COLOR = '#020617';

export function resolveStoredTheme(): Theme {
  const stored = safeGetItem(STORAGE_KEY.theme);
  return stored === 'dark' ? 'dark' : DEFAULT_THEME;
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;

  const themeColor = theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', themeColor);
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  safeSetItem(STORAGE_KEY.theme, theme);
}

export function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

