import { STORAGE_KEY } from '@/config/storage-keys';
import {
  applyTheme,
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  resolveStoredTheme,
  setTheme,
} from '@/lib/theme';

describe('theme helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    document.head.innerHTML = '<meta name="theme-color" content="#ffffff">';
  });

  it('should resolve light by default', () => {
    expect(resolveStoredTheme()).toBe('light');
  });

  it('should apply dark theme to document root and meta color', () => {
    applyTheme('dark');

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', DARK_THEME_COLOR);
  });

  it('should persist selected theme', () => {
    setTheme('light');
    localStorage.setItem(STORAGE_KEY.theme, 'dark');

    expect(localStorage.getItem(STORAGE_KEY.theme)).toBe('dark');
    expect(resolveStoredTheme()).toBe('dark');

    setTheme('light');
    expect(localStorage.getItem(STORAGE_KEY.theme)).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', LIGHT_THEME_COLOR);
  });
});
