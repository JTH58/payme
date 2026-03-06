'use client';

import { useEffect, useState } from 'react';
import { PasswordGate } from '@/modules/analytics/components/password-gate';
import { Dashboard } from '@/modules/analytics/components/dashboard';
import { fetchAnalytics } from '@/modules/analytics/lib/api';

export default function AnalyticsPage() {
  // null = checking session, false = need login, true = authenticated
  const [auth, setAuth] = useState<boolean | null>(null);

  useEffect(() => {
    fetchAnalytics('summary', '7d')
      .then(() => setAuth(true))
      .catch((err) => {
        // Only show login gate on 401; other errors (500) mean session is valid but server has issues
        const status = (err as Error & { status?: number }).status;
        setAuth(status === 401 ? false : true);
      });
  }, []);

  if (auth === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!auth) {
    return <PasswordGate onSuccess={() => setAuth(true)} />;
  }

  return <Dashboard />;
}
