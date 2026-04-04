'use client';

import { useEffect, useState } from 'react';

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_PREFS: NotificationPref[] = [
  { key: 'bid_on_scope', label: 'New bid on your scope', description: 'Get notified when a squad submits a bid on a scope you posted.', enabled: true },
  { key: 'bid_accepted', label: 'Bid accepted', description: 'Get notified when your bid is accepted by a client.', enabled: true },
  { key: 'deliverable_status', label: 'Deliverable status change', description: 'Get notified when a deliverable moves to a new status (in progress, review, completed).', enabled: true },
  { key: 'new_message', label: 'New message', description: 'Get notified when someone sends a message in a contract discussion you are part of.', enabled: false },
  { key: 'contract_completed', label: 'Contract completed', description: 'Get notified when a contract is marked as completed and payment is released.', enabled: true },
];

const STORAGE_KEY = 'squadswarm_notification_prefs';

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPref[]>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        setPrefs((prev) =>
          prev.map((p) => ({
            ...p,
            enabled: p.key in parsed ? Boolean(parsed[p.key]) : p.enabled,
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  function togglePref(key: string) {
    setSaved(false);
    setPrefs((prev) =>
      prev.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p))
    );
  }

  function handleSave() {
    const data: Record<string, boolean> = {};
    prefs.forEach((p) => { data[p.key] = p.enabled; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Notification Preferences</h1>
        <p className="text-text-secondary text-sm mt-1">Choose how and when you receive email notifications.</p>
      </div>

      {/* Notification Toggles */}
      <div className="bg-white rounded-xl border border-border divide-y divide-border mb-6">
        {prefs.map((pref) => (
          <div key={pref.key} className="flex items-center justify-between p-5">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-text-primary">{pref.label}</p>
              <p className="text-xs text-text-secondary mt-0.5">{pref.description}</p>
            </div>

            {/* Toggle Switch */}
            <button
              role="switch"
              aria-checked={pref.enabled}
              onClick={() => togglePref(pref.key)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                pref.enabled ? 'bg-accent-squad' : 'bg-border'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                  pref.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad/90 transition-colors"
        >
          Save Preferences
        </button>
        {saved && (
          <span className="text-sm text-success font-medium">Saved successfully</span>
        )}
      </div>
    </div>
  );
}
