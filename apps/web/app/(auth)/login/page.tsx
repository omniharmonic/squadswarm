'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useWeb3 } from '@/components/web3-provider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { connect, address, isConnected } = useWeb3();
  const [walletLoading, setWalletLoading] = useState(false);

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
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  async function handleWalletSignIn() {
    setWalletLoading(true);
    try {
      await connect();
      // After wallet connects, trigger SIWE
      const nonceRes = await fetch('/api/auth/siwe');
      const { nonce } = await nonceRes.json();

      const message = [
        `${window.location.host} wants you to sign in with your Ethereum account:`,
        address,
        '',
        'Sign in to SquadSwarm.',
        '',
        `URI: ${window.location.origin}`,
        `Version: 1`,
        `Chain ID: 8453`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join('\n');

      // Request signature from wallet
      const signature = await window.ethereum?.request({
        method: 'personal_sign',
        params: [message, address],
      });

      const res = await fetch('/api/auth/siwe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Wallet sign-in failed');
      }

      toast.success('Signed in with wallet');
      window.location.href = '/dashboard';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wallet sign-in failed';
      if (!msg.includes('User rejected') && !msg.includes('No wallet')) {
        toast.error(msg);
      }
    } finally {
      setWalletLoading(false);
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
        </p>
        <button onClick={() => { setStatus('idle'); setEmail(''); }} className="mt-6 text-sm text-accent-agent hover:text-accent-agent-hover transition-colors">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
      <h2 className="text-xl font-semibold mb-2 text-text-primary">Sign in to SquadSwarm</h2>
      <p className="text-text-secondary text-sm mb-6">Enter your email and we'll send you a magic link.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-text-primary">Email address</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-agent/40 focus:border-accent-agent text-sm placeholder:text-text-secondary/50 transition-colors"
            disabled={status === 'loading'} />
        </div>
        {status === 'error' && <p className="text-sm text-error">{errorMessage}</p>}
        <button type="submit" disabled={status === 'loading'}
          className="w-full py-2.5 px-4 bg-accent-squad text-white rounded-xl font-medium text-sm hover:bg-accent-squad-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>

      {/* Wallet sign-in */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-text-secondary">or</span></div>
      </div>

      <button onClick={handleWalletSignIn} disabled={walletLoading}
        className="w-full py-2.5 px-4 border border-border rounded-xl font-medium text-sm hover:bg-bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h.008a2.248 2.248 0 012.242 2.25M21 12v6.75A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75V12m18 0H3m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12" />
        </svg>
        {walletLoading ? 'Connecting...' : isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Sign in with Wallet'}
      </button>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <a href="/signup" className="text-accent-agent hover:text-accent-agent-hover font-medium transition-colors">Sign up</a>
      </p>
    </div>
  );
}
