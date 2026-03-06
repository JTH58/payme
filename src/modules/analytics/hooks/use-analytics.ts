'use client';

import { useEffect, useState } from 'react';
import { fetchAnalytics } from '../lib/api';
import type { TimeRange } from '../types';

export function useAnalytics<T>(type: string, range: TimeRange) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchAnalytics<T>(type, range)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [type, range]);

  return { data, isLoading, error };
}
