'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  web3Enabled: boolean;
  createdAt: string;
}

export default function AccountSettingsPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => { if (!data.error) setUser(data); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/session', { method: 'DELETE' });
    window.location.href = '/login';
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account.</p>
      </div>

      <div className="space-y-4">
        {/* Account Info */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Email</span>
              <span className="font-medium">{user?.email || '...'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Member since</span>
              <span className="font-medium">{user ? new Date(user.createdAt).toLocaleDateString() : '...'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-secondary">Web3</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user?.web3Enabled ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-secondary'}`}>
                {user?.web3Enabled ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Preferences</h2>
          <div className="space-y-2">
            <Link href="/profile" className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-primary transition-colors">
              <span className="text-sm font-medium">Edit Profile</span>
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/settings/notifications" className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-primary transition-colors">
              <span className="text-sm font-medium">Notification Preferences</span>
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/settings/wallet" className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-primary transition-colors">
              <span className="text-sm font-medium">Wallet & Web3</span>
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Session</h2>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-error/30 text-error rounded-lg text-sm font-medium hover:bg-error/5 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
