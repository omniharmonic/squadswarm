'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { toast } from 'sonner';

interface Squad {
  id: string;
  name: string;
  role: string;
}

interface ScopeInfo {
  id: string;
  title: string;
  budgetMin: string | null;
  budgetMax: string | null;
  timelineDays: number | null;
  status: string;
}

function BidBuilderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scopeId = searchParams.get('scopeId');

  const [squads, setSquads] = useState<Squad[]>([]);
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);
  const [scopeLoading, setScopeLoading] = useState(true);
  const [selectedSquadId, setSelectedSquadId] = useState('');
  const [approach, setApproach] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [upfrontPercentage, setUpfrontPercentage] = useState(25);
  const [timelineNotes, setTimelineNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle');
  const [bidId, setBidId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/squads')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSquads(data);
      })
      .catch(() => {
        // Mock data fallback
        setSquads([
          { id: 'mock-squad-1', name: 'Regen Builders', role: 'admin' },
          { id: 'mock-squad-2', name: 'Impact Labs', role: 'member' },
        ]);
      });
  }, []);

  useEffect(() => {
    if (!scopeId) {
      setScopeLoading(false);
      return;
    }
    fetch(`/api/scopes/${scopeId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Scope not found');
        return res.json();
      })
      .then((data) => setScopeInfo(data))
      .catch(() => setScopeInfo(null))
      .finally(() => setScopeLoading(false));
  }, [scopeId]);

  async function handleSave() {
    if (!scopeId || !selectedSquadId) return;
    setStatus('loading');

    try {
      const endpoint = bidId ? `/api/bids/${bidId}` : `/api/scopes/${scopeId}/bids`;
      const method = bidId ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squadId: selectedSquadId,
          approach,
          proposedPrice,
          paymentSchedule: {
            upfrontPercentage,
            finalPercentage: 100 - upfrontPercentage,
          },
          proposedTimeline: { notes: timelineNotes },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBidId(data.id);
        setStatus('saved');
        toast.success('Draft saved');
      } else {
        const data = await res.json();
        setStatus('error');
        toast.error(data.error || 'Failed to save draft');
      }
    } catch {
      setStatus('error');
      toast.error('Failed to save draft');
    }
  }

  async function handleSubmit() {
    if (!bidId) {
      await handleSave();
    }
    if (status === 'error') return;
    toast.success('Bid submitted!');
    router.push(`/scopes/${scopeId}`);
  }

  if (!scopeId) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">No scope selected. Go to the Scope Board to find work.</p>
        <Link href="/scopes" className="text-accent-squad hover:underline mt-2 inline-block">
          Browse Scopes
        </Link>
      </div>
    );
  }

  if (scopeLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!scopeLoading && !scopeInfo) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold mb-2">Scope Not Found</h1>
        <p className="text-text-secondary text-sm mb-4">This scope may have been removed or the link is incorrect.</p>
        <Link href="/scopes" className="text-accent-squad hover:underline">
          Browse Scopes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/scopes/${scopeId}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Scope
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Build Your Bid</h1>
        {scopeInfo && (
          <p className="text-text-secondary mt-1">
            Bidding on: <span className="font-medium text-text-primary">{scopeInfo.title}</span>
          </p>
        )}
      </div>

      <div className="space-y-6">
        {/* Squad Selection */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Bidding Squad</h2>
          <label htmlFor="squad" className="block text-sm font-medium mb-1.5">
            Select your squad
          </label>
          <select
            id="squad"
            value={selectedSquadId}
            onChange={(e) => setSelectedSquadId(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary
                       focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm"
          >
            <option value="">Choose a squad...</option>
            {squads.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        </div>

        {/* Approach */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Your Approach</h2>
          <p className="text-text-secondary text-sm mb-3">
            Describe how your squad would tackle this scope. What makes your team uniquely qualified?
          </p>
          <textarea
            value={approach}
            onChange={(e) => setApproach(e.target.value)}
            rows={8}
            placeholder="Outline your approach, methodology, key differentiators, and why your squad is the right fit..."
            className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary
                       focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm
                       placeholder:text-text-secondary/50 resize-y"
          />
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Pricing & Terms</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-1.5">
                Total bid amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-text-secondary text-sm">$</span>
                <input
                  id="price"
                  type="number"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3.5 py-2.5 border border-border rounded-lg bg-bg-primary
                             focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="upfront" className="block text-sm font-medium mb-1.5">
                Upfront payment: {upfrontPercentage}%
              </label>
              <input
                id="upfront"
                type="range"
                min={0}
                max={50}
                value={upfrontPercentage}
                onChange={(e) => setUpfrontPercentage(Number(e.target.value))}
                className="w-full mt-2 accent-accent-squad"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>0%</span>
                <span>50%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Timeline</h2>
          <textarea
            value={timelineNotes}
            onChange={(e) => setTimelineNotes(e.target.value)}
            rows={3}
            placeholder="Describe your proposed timeline, milestones, and delivery schedule..."
            className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary
                       focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm
                       placeholder:text-text-secondary/50 resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            {status === 'saved' && (
              <span className="text-success">Draft saved</span>
            )}
            {status === 'error' && (
              <span className="text-error">Failed to save</span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!selectedSquadId || status === 'loading'}
              className="px-5 py-2.5 border border-border rounded-lg font-medium text-sm
                         hover:bg-bg-secondary transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedSquadId || !approach || !proposedPrice || status === 'loading'}
              className="px-5 py-2.5 bg-accent-squad text-white rounded-lg font-medium text-sm
                         hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Submitting...' : 'Submit Bid'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewBidPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <BidBuilderContent />
    </Suspense>
  );
}
