'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.user) {
          setDisplayName(data.user.displayName || data.user.email || null);
        }
      })
      .catch(() => {});
  }, []);

  const initials = displayName ? getInitials(displayName) : 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-secondary transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-accent-agent/10 text-accent-agent flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-xl shadow-lg py-1 z-50">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
          >
            Settings
          </Link>
          <div className="border-t border-border my-1" />
          <button
            onClick={async () => {
              await fetch('/api/auth/session', { method: 'DELETE' });
              window.location.href = '/login';
            }}
            className="block w-full text-left px-4 py-2 text-sm text-accent-squad hover:bg-bg-secondary transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
