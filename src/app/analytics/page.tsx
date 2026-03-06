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
      .catch(() => setAuth(false));
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
