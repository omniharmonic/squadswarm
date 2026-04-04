'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided');
      return;
    }

    async function verify() {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Verification failed');
        }

        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 1500);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Verification failed');
      }
    }

    verify();
  }, [searchParams, router]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center">
      {status === 'verifying' && (
        <>
          <div className="w-8 h-8 border-2 border-accent-agent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-text-primary">Verifying...</h2>
          <p className="text-text-secondary text-sm">Signing you in to SquadSwarm.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-text-primary">You&apos;re in!</h2>
          <p className="text-text-secondary text-sm">Redirecting to your dashboard...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-text-primary">Verification failed</h2>
          <p className="text-text-secondary text-sm mb-4">{errorMessage}</p>
          <a
            href="/login"
            className="text-accent-agent hover:text-accent-agent-hover text-sm font-medium transition-colors"
          >
            Try signing in again
          </a>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center">
          <div className="w-8 h-8 border-2 border-accent-agent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-text-primary">Loading...</h2>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
