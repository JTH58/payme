'use client';

import { useEffect, useState } from 'react';
import { Moon, SunMedium } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitialTheme, setTheme, type Theme } from '@/lib/theme';

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    setThemeState(getInitialTheme());
  }, []);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => {
        setThemeState(nextTheme);
        setTheme(nextTheme);
      }}
      aria-label={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
      title={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
      className={cn('theme-icon-button', className)}
    >
      {theme === 'dark' ? <SunMedium size={14} /> : <Moon size={14} />}
    </button>
  );
}
