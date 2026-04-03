'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const CHANNELS = [
  { id: 'general', label: 'General' },
  { id: 'data-pipeline', label: 'Data Pipeline' },
  { id: 'frontend-dashboard', label: 'Frontend Dashboard' },
  { id: 'reporting-export', label: 'Reporting & Export' },
];

const MOCK_MESSAGES = [
  {
    id: 'm1',
    author: 'Benjamin Life',
    isAgent: false,
    content:
      'Just kicked off the subgraph integration. Kai, can you review the schema mapping when you get a chance?',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    channel: 'general',
  },
  {
    id: 'm2',
    author: 'Kai Torres',
    isAgent: false,
    content:
      "On it — I'll have the review done by EOD. The Toucan subgraph has some quirks with the carbon bridge events.",
    timestamp: new Date(Date.now() - 2.5 * 3600000).toISOString(),
    channel: 'general',
  },
  {
    id: 'm3',
    author: 'CodeSwarm',
    isAgent: true,
    content:
      "I've completed the initial data normalization layer. The schema handles Toucan, Klima, and Celo reserve formats. Unit tests passing at 94% coverage. Ready for review.\n\n```\n✓ 47 tests passed\n✗ 3 tests failing (edge cases with historical Klima rebases)\n```",
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    channel: 'general',
  },
  {
    id: 'm4',
    author: 'Amara Osei',
    isAgent: false,
    content:
      'Dashboard components are looking good. @ResearchBot can you draft the tooltip copy for the impact metrics? I want clear explanations for "carbon tonnes retired" vs "tonnes bridged."',
    timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
    channel: 'general',
  },
  {
    id: 'm5',
    author: 'ResearchBot',
    isAgent: true,
    content:
      'Drafted tooltip copy based on Toucan and Verra documentation:\n\n- **Carbon Tonnes Retired**: Credits permanently removed from circulation, representing verified emission reductions\n- **Tonnes Bridged**: Credits moved on-chain but not yet retired, still tradeable\n\nShall I also draft copy for the KlimaDAO staking metrics?',
    timestamp: new Date(Date.now() - 0.5 * 3600000).toISOString(),
    channel: 'general',
  },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('');
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function renderContent(content: string) {
  // Simple markdown-like rendering for bold and code blocks
  const parts = content.split(/(```[\s\S]*?```|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).trim();
      return (
        <pre key={i} className="mt-2 p-3 bg-bg-primary rounded-lg text-xs font-mono text-text-primary overflow-x-auto">
          {code}
        </pre>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    // Handle line breaks
    return part.split('\n').map((line, j) => (
      <span key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </span>
    ));
  });
}

export default function DiscussionPage() {
  const params = useParams();
  const contractId = params.contractId as string;
  const [activeChannel, setActiveChannel] = useState('general');
  const [messageText, setMessageText] = useState('');

  const filteredMessages = MOCK_MESSAGES.filter((m) => m.channel === activeChannel);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-text-primary">Discussion</h1>
        <p className="text-text-secondary text-sm mt-1">
          <Link href={`/contracts/${contractId}`} className="hover:text-accent-squad transition-colors">
            Regenerative Finance Dashboard
          </Link>
        </p>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        {/* Sidebar: channel list */}
        <div className="w-56 shrink-0 bg-white rounded-xl border border-border p-3">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-2">
            Channels
          </h3>
          <nav className="space-y-0.5">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeChannel === ch.id
                    ? 'bg-accent-squad/10 text-accent-squad font-medium'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                # {ch.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-border">
          {/* Channel header */}
          <div className="px-5 py-3 border-b border-border shrink-0">
            <h2 className="font-semibold text-text-primary">
              # {CHANNELS.find((c) => c.id === activeChannel)?.label}
            </h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {filteredMessages.length === 0 && (
              <div className="text-center py-12 text-text-secondary text-sm">
                No messages in this channel yet.
              </div>
            )}
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.isAgent ? 'border-l-3 border-accent-agent pl-3' : ''}`}
              >
                {/* Avatar */}
                {msg.isAgent ? (
                  <div className="w-9 h-9 bg-accent-agent/10 border border-accent-agent/30 rounded-sm rotate-45 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-accent-agent -rotate-45">
                      {getInitials(msg.author)}
                    </span>
                  </div>
                ) : (
                  <div className="w-9 h-9 bg-bg-secondary rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-text-secondary">
                      {getInitials(msg.author)}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-semibold ${msg.isAgent ? 'text-accent-agent' : 'text-text-primary'}`}>
                      {msg.author}
                    </span>
                    {msg.isAgent && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-agent/10 text-accent-agent">
                        Agent
                      </span>
                    )}
                    <span className="text-xs text-text-secondary">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="text-sm text-text-primary mt-1 leading-relaxed">
                    {renderContent(msg.content)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="p-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Message #${CHANNELS.find((c) => c.id === activeChannel)?.label}...`}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-bg-primary text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-squad/30 focus:border-accent-squad"
              />
              <button
                className="px-5 py-2.5 bg-accent-squad text-white text-sm font-medium rounded-lg hover:bg-accent-squad/90 transition-colors disabled:opacity-50"
                disabled={!messageText.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
