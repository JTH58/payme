'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { STORAGE_KEY } from '@/config/storage-keys';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaStatus {
  isInstalled: boolean;
  canPromptInstall: boolean;
  promptInstall: () => Promise<void>;
  showBadge: boolean;
  dismissBadge: () => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function usePwaStatus(): PwaStatus {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canPromptInstall, setCanPromptInstall] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true;

    setIsInstalled(isStandalone);

    // Determine badge visibility
    if (!isStandalone) {
      const dismissed = safeGetItem(STORAGE_KEY.pwaPromptDismissed);
      if (!dismissed || Date.now() - Number(dismissed) > SEVEN_DAYS_MS) {
        setShowBadge(true);
      }
    }

    // Listen for display-mode changes
    const mq = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mq.addEventListener('change', handleChange);

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanPromptInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for appinstalled
    const handleInstalled = () => {
      setIsInstalled(true);
      setCanPromptInstall(false);
      setShowBadge(false);
      deferredPrompt.current = null;
    };
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      mq.removeEventListener('change', handleChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setCanPromptInstall(false);
    deferredPrompt.current = null;
  }, []);

  const dismissBadge = useCallback(() => {
    safeSetItem(STORAGE_KEY.pwaPromptDismissed, String(Date.now()));
    setShowBadge(false);
  }, []);

  return { isInstalled, canPromptInstall, promptInstall, showBadge, dismissBadge };
}
