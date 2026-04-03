'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FormData = {
  title: string;
  narrative: string;
  categoryTags: string;
  budgetMin: string;
  budgetMax: string;
  timelineDays: number;
  feedbackRounds: number;
  trustThreshold: string;
  confidentiality: string;
};

const initialForm: FormData = {
  title: '',
  narrative: '',
  categoryTags: '',
  budgetMin: '',
  budgetMax: '',
  timelineDays: 30,
  feedbackRounds: 3,
  trustThreshold: 'open',
  confidentiality: 'public',
};

export default function SubmitScopePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError('');
    try {
      const method = savedId ? 'PATCH' : 'POST';
      const url = savedId
        ? `/api/scope-proposals/${savedId}`
        : '/api/scope-proposals';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categoryTags: form.categoryTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save draft');
      }

      const data = await res.json();
      if (data.id) setSavedId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForAnalysis() {
    setSubmitting(true);
    setError('');
    try {
      // Save first
      const method = savedId ? 'PATCH' : 'POST';
      const url = savedId
        ? `/api/scope-proposals/${savedId}`
        : '/api/scope-proposals';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categoryTags: form.categoryTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const data = await res.json();
      const id = data.id || savedId;
      if (id) {
        router.push(`/scopes/${id}/analyze`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-squad/50 focus:border-accent-squad text-sm placeholder:text-text-secondary/50';

  const labelClass = 'block text-sm font-medium text-text-primary mb-1.5';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Submit a Scope</h1>
        <p className="text-text-secondary mt-1">
          Define your project requirements and find the right squad.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 sm:p-8">
        <div className="space-y-6">
          {/* Project Title */}
          <div>
            <label htmlFor="title" className={labelClass}>
              Project Title
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Regenerative Finance Dashboard"
              className={inputClass}
            />
          </div>

          {/* Scope Narrative */}
          <div>
            <label htmlFor="narrative" className={labelClass}>
              Scope Narrative
            </label>
            <textarea
              id="narrative"
              rows={6}
              value={form.narrative}
              onChange={(e) => update('narrative', e.target.value)}
              placeholder="Describe what you need built, the context, goals, and any constraints..."
              className={`${inputClass} resize-y`}
            />
            <p className="mt-1 text-xs text-text-secondary">
              Markdown formatting is supported.
            </p>
          </div>

          {/* Category Tags */}
          <div>
            <label htmlFor="categoryTags" className={labelClass}>
              Category Tags
            </label>
            <input
              id="categoryTags"
              type="text"
              value={form.categoryTags}
              onChange={(e) => update('categoryTags', e.target.value)}
              placeholder="web development, DeFi, data visualization"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-text-secondary">
              Separate tags with commas.
            </p>
          </div>

          {/* Budget Range */}
          <div>
            <label className={labelClass}>Budget Range</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.budgetMin}
                  onChange={(e) => update('budgetMin', e.target.value)}
                  placeholder="Min"
                  className={`${inputClass} pl-7`}
                />
              </div>
              <span className="text-text-secondary text-sm">&ndash;</span>
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.budgetMax}
                  onChange={(e) => update('budgetMax', e.target.value)}
                  placeholder="Max"
                  className={`${inputClass} pl-7`}
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label htmlFor="timelineDays" className={labelClass}>
              Timeline
            </label>
            <div className="relative max-w-xs">
              <input
                id="timelineDays"
                type="number"
                min={1}
                value={form.timelineDays}
                onChange={(e) =>
                  update('timelineDays', parseInt(e.target.value) || 0)
                }
                className={`${inputClass} pr-14`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
                days
              </span>
            </div>
          </div>

          {/* Feedback Rounds */}
          <div>
            <label htmlFor="feedbackRounds" className={labelClass}>
              Feedback Rounds
            </label>
            <input
              id="feedbackRounds"
              type="number"
              min={1}
              max={10}
              value={form.feedbackRounds}
              onChange={(e) =>
                update(
                  'feedbackRounds',
                  Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                )
              }
              className={`${inputClass} max-w-xs`}
            />
          </div>

          {/* Trust Threshold */}
          <div>
            <label htmlFor="trustThreshold" className={labelClass}>
              Trust Threshold
            </label>
            <select
              id="trustThreshold"
              value={form.trustThreshold}
              onChange={(e) => update('trustThreshold', e.target.value)}
              className={`${inputClass} max-w-xs`}
            >
              <option value="open">Open</option>
              <option value="verified">Verified</option>
              <option value="trusted">Trusted</option>
              <option value="elite">Elite</option>
            </select>
          </div>

          {/* Confidentiality */}
          <div>
            <label className={labelClass}>Confidentiality</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              {(['public', 'nda_required', 'invite_only'] as const).map(
                (val) => {
                  const labels: Record<string, string> = {
                    public: 'Public',
                    nda_required: 'NDA Required',
                    invite_only: 'Invite Only',
                  };
                  return (
                    <label
                      key={val}
                      className="flex items-center gap-2 cursor-pointer text-sm text-text-primary"
                    >
                      <input
                        type="radio"
                        name="confidentiality"
                        value={val}
                        checked={form.confidentiality === val}
                        onChange={() => update('confidentiality', val)}
                        className="accent-accent-squad"
                      />
                      {labels[val]}
                    </label>
                  );
                }
              )}
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-error">{error}</p>}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || submitting}
              className="py-2.5 px-5 border border-border rounded-lg text-sm font-medium text-text-primary
                         hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleSubmitForAnalysis}
              disabled={saving || submitting || !form.title.trim()}
              className="py-2.5 px-5 bg-accent-squad text-white rounded-lg text-sm font-medium
                         hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit for AI Analysis'}
            </button>
          </div>

          {savedId && (
            <p className="text-xs text-success">
              Draft saved successfully.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
