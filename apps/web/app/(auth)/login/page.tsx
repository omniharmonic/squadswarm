'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send magic link');
      }

      setStatus('sent');
      toast.success('Check your email for the magic link');
    } catch (err) {
      setStatus('error');
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMessage(message);
      toast.error(message);
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center">
        <div className="w-12 h-12 bg-accent-agent/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-accent-agent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2 text-text-primary">Check your email</h2>
        <p className="text-text-secondary">
          We sent a sign-in link to <span className="font-medium text-text-primary">{email}</span>.
          Click the link in the email to sign in.
        </p>
        <button
          onClick={() => { setStatus('idle'); setEmail(''); }}
          className="mt-6 text-sm text-accent-agent hover:text-accent-agent-hover font-medium transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
      <h2 className="text-xl font-semibold mb-2 text-text-primary">Sign in to SquadSwarm</h2>
      <p className="text-text-secondary text-sm mb-6">
        Enter your email and we&apos;ll send you a magic link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-text-primary">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-bg-primary
                       focus:outline-none focus:ring-2 focus:ring-accent-agent/40 focus:border-accent-agent
                       text-sm placeholder:text-text-secondary/50 transition-colors"
            disabled={status === 'loading'}
          />
        </div>

        {status === 'error' && (
          <p className="text-sm text-error">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-2.5 px-4 bg-accent-squad text-white rounded-xl font-medium text-sm
                     hover:bg-accent-squad-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <a href="/signup" className="text-accent-agent hover:text-accent-agent-hover font-medium transition-colors">
          Sign up
        </a>
      </p>
    </div>
  );
}
