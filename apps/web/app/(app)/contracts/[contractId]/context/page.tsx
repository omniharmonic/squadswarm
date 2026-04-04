'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ProjectContextPage() {
  const params = useParams();
  const contractId = params.contractId as string;

  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [contractTitle, setContractTitle] = useState('');

  const fetchContext = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/context`);
      if (res.ok) {
        const data = await res.json();
        setContext(data.context || '');
      }
    } catch {
      // Leave empty on failure
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchContext();
    fetch(`/api/contracts/${contractId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setContractTitle(data.title);
      })
      .catch(() => {});
  }, [contractId, fetchContext]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`/api/contracts/${contractId}/context`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Project Context</h1>
        <p className="text-text-secondary text-sm mt-1">
          <Link
            href={`/contracts/${contractId}`}
            className="hover:text-accent-squad transition-colors"
          >
            {contractTitle || 'Contract'}
          </Link>
        </p>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Markdown Editor
          </h2>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm text-success font-medium">Saved</span>
            )}
            {error && (
              <span className="text-sm text-error font-medium">{error}</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-accent-squad text-white text-sm font-medium rounded-lg hover:bg-accent-squad/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={30}
          className="w-full rounded-lg border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary font-mono leading-relaxed placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-squad/30 focus:border-accent-squad resize-y"
          placeholder="Write project context in markdown..."
        />
      </div>
    </div>
  );
}
