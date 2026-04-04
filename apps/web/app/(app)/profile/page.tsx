'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  trustScore: string;
  web3Enabled: boolean;
  createdAt: string;
}

export default function MyProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setUser(data);
          setDisplayName(data.displayName || '');
          setBio(data.bio || '');
        }
      })
      .catch(() => {});

    // Refresh trust score in background
    fetch('/api/users/me/trust-score')
      .then((r) => r.json())
      .then((data) => {
        if (data.trustScore !== undefined) {
          setUser((prev) =>
            prev ? { ...prev, trustScore: String(data.trustScore) } : prev,
          );
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {}
    setSaving(false);
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const initials = (user.displayName || user.email || '?')
    .split(/[\s@]/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-text-secondary mt-1">Manage your public profile.</p>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-accent-squad/10 rounded-full flex items-center justify-center">
            <span className="text-accent-squad font-bold text-xl">{initials}</span>
          </div>
          <div>
            <p className="font-semibold text-lg">{user.displayName || 'Unnamed'}</p>
            <p className="text-sm text-text-secondary">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 bg-bg-primary rounded-lg border border-border mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold">{parseFloat(user.trustScore).toFixed(0)}</p>
            <p className="text-xs text-text-secondary">Trust Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{user.web3Enabled ? 'Yes' : 'No'}</p>
            <p className="text-xs text-text-secondary">Web3 Enabled</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
            <p className="text-xs text-text-secondary">Joined</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1.5">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-1.5">Bio</label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm resize-y"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && <span className="text-sm text-success">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
