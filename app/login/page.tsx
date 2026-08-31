'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push('/app');
    router.refresh();
  }

  async function handleGoogle() {
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (authError) setError(authError.message);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <img src="/logo-mark.svg" alt="" width={28} height={28} className="rounded-lg" />
          <span className="text-lg font-semibold text-zinc-900">VoiceDNA</span>
        </div>

        <h1 className="text-2xl font-semibold text-zinc-900 mb-6 text-center">
          {mode === 'signin' ? 'Log in' : 'Sign up'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 text-white py-2.5 font-medium hover:bg-zinc-800 transition disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <button
          onClick={handleGoogle}
          className="mt-3 w-full rounded-lg border border-zinc-300 py-2.5 font-medium hover:bg-zinc-50 transition"
        >
          Continue with Google
        </button>

        <p className="mt-5 text-center text-sm text-zinc-600">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="underline"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </main>
  );
}
