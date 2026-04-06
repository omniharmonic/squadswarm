'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'bid_vote':
      return (
        <svg className="w-5 h-5 text-accent-agent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case 'claim':
      return (
        <svg className="w-5 h-5 text-accent-squad" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
        </svg>
      );
    case 'agent_action':
      return (
        <svg className="w-5 h-5 text-accent-agent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'contract':
      return (
        <svg className="w-5 h-5 text-accent-client" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'deliverable':
      return (
        <svg className="w-5 h-5 text-accent-squad" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'message':
      return (
        <svg className="w-5 h-5 text-accent-agent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
  }
}

function getNavigationUrl(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  if (metadata.bidId) {
    if (metadata.action === 'vote') return `/bids/${metadata.bidId}/vote`;
    return `/bids/${metadata.bidId}/collaborate`;
  }
  if (metadata.contractId) return `/contracts/${metadata.contractId}/workspace`;
  if (metadata.scopeId) return `/scopes/${metadata.scopeId}`;
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (unreadOnly) params.set('unreadOnly', 'true');

      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.notifications);
      setPagination(data.pagination);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setItems((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
    } catch {
      // silently fail
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead([notification.id]);
    }
    const url = getNavigationUrl(notification.metadata);
    if (url) {
      router.push(url);
    }
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Notifications</h1>
          {pagination && (
            <p className="text-sm text-text-muted mt-1">
              {pagination.total} total{unreadCount > 0 ? ` \u00b7 ${unreadCount} unread on this page` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="text-sm text-accent-agent hover:text-accent-agent-hover transition-colors disabled:opacity-50"
          >
            {markingAll ? 'Marking...' : 'Mark all read'}
          </button>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-1 mb-6 bg-bg-secondary rounded-xl p-1 w-fit">
        <button
          onClick={() => { setUnreadOnly(false); setPage(1); }}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !unreadOnly
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          All
        </button>
        <button
          onClick={() => { setUnreadOnly(true); setPage(1); }}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            unreadOnly
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Unread only
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="text-center py-20">
          <svg className="w-12 h-12 mx-auto text-text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium text-text-primary">All caught up!</p>
          <p className="text-sm text-text-muted mt-1">
            {unreadOnly ? 'No unread notifications.' : 'You have no notifications yet.'}
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((notification) => {
            const navUrl = getNavigationUrl(notification.metadata);
            return (
              <button
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-colors ${
                  notification.read
                    ? 'bg-white border-border hover:bg-bg-secondary'
                    : 'bg-white border-border hover:bg-bg-secondary'
                } ${navUrl ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {/* Icon */}
                <div className={`mt-0.5 shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                  notification.read ? 'bg-bg-secondary' : 'bg-bg-secondary'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notification.read ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                    {notification.title}
                  </p>
                  {notification.body && (
                    <p className="text-sm text-text-muted mt-0.5 line-clamp-2">
                      {notification.body}
                    </p>
                  )}
                  <p className="text-xs text-text-muted mt-1.5">{timeAgo(notification.createdAt)}</p>
                </div>

                {/* Unread dot */}
                {!notification.read && (
                  <div className="mt-2 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent-squad" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && (pagination.page > 1 || pagination.hasMore) && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm text-accent-agent hover:text-accent-agent-hover disabled:text-text-muted disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit) || 1}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasMore}
            className="text-sm text-accent-agent hover:text-accent-agent-hover disabled:text-text-muted disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
