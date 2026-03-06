'use client';

import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { login } from '../lib/api';

interface PasswordGateProps {
  onSuccess: () => void;
}

export function PasswordGate({ onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(password);
    setLoading(false);

    if (result.ok) {
      onSuccess();
    } else {
      setError(result.error || 'Login failed');
      setPassword('');
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-sm bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 space-y-6 ${
          error ? 'animate-shake' : ''
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-full bg-blue-500/10">
            <Lock className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Analytics</h1>
        </div>

        <div className="space-y-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {loading ? 'Verifying...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
