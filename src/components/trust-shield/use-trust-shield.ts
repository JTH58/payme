'use client';

import { useState, useEffect } from 'react';
import { STORAGE_KEY } from '@/config/storage-keys';
import { safeGetItem, safeSetItem } from '@/lib/safe-storage';

export type TrustStatus = 'checking' | 'verified' | 'offline' | 'unknown' | 'tampered';

interface TrustResult {
  status: TrustStatus;
  sha: string | undefined;
  buildTime: string | undefined;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

interface CacheEntry {
  status: TrustStatus;
  sha: string;
  timestamp: number;
}

function readCache(sha: string): CacheEntry | null {
  try {
    const raw = safeGetItem(STORAGE_KEY.trustShieldCache);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.sha !== sha) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeCache(sha: string, status: TrustStatus): void {
  const entry: CacheEntry = { status, sha, timestamp: Date.now() };
  safeSetItem(STORAGE_KEY.trustShieldCache, JSON.stringify(entry));
}

function readExpiredCache(sha: string): CacheEntry | null {
  try {
    const raw = safeGetItem(STORAGE_KEY.trustShieldCache);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.sha !== sha) return null;
    return entry;
  } catch {
    return null;
  }
}

export function useTrustShield(): TrustResult {
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA;
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;

  const [status, setStatus] = useState<TrustStatus>('checking');

  useEffect(() => {
    // No SHA or invalid format → unknown (dev build, not tampered)
    if (!sha || !SHA_PATTERN.test(sha)) {
      setStatus('unknown');
      return;
    }

    // Check localStorage cache first
    const cached = readCache(sha);
    if (cached) {
      setStatus(cached.status);
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch(`/api/verify-build?sha=${sha}`);
        const data: { status?: string } = await res.json();

        if (cancelled) return;

        if (data.status === 'verified') {
          setStatus('verified');
          writeCache(sha!, 'verified');
        } else {
          // Don't cache 'unknown' — allow re-check on next visit
          setStatus('unknown');
        }
      } catch {
        if (cancelled) return;

        // Network error — use expired cache status as fallback, otherwise offline
        const expired = readExpiredCache(sha!);
        setStatus(expired ? expired.status : 'offline');
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [sha]);

  return { status, sha, buildTime };
}
