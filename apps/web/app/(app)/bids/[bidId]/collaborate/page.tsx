'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { SkillBadge } from '@/components/skill-badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BidData {
  id: string;
  scopeId: string;
  squadId: string;
  createdById: string;
  approach: string | null;
  proposedPrice: string | null;
  paymentSchedule: { upfrontPercent?: number } | null;
  proposedTimeline: { notes?: string } | null;
  treasuryShareBps: number;
  status: string;
  governanceStatus: string | null;
  governanceDeadline: string | null;
  ratifiedAt: string | null;
  updatedAt: string;
}

interface ScopeData {
  id: string;
  title: string;
  workPlan: {
    workstreams?: {
      title: string;
      deliverables?: {
        title: string;
        format?: string;
        estimatedEffortHours?: number;
        estimatedHours?: number;
        requiredSkills?: string[];
        skills?: string[];
      }[];
    }[];
  } | null;
}

interface Claim {
  id: string;
  bidId: string;
  deliverableKey: string;
  userId: string | null;
  agentId: string | null;
  paymentShareBps: number;
  note: string | null;
  createdAt: string;
  assigneeName: string;
  isAgent: boolean;
}

interface BidComment {
  id: string;
  bidId: string;
  userId: string;
  deliverableKey: string | null;
  content: string;
  createdAt: string;
  authorDisplayName: string;
}

interface SquadMember {
  id: string;
  userId: string;
  role: string;
  userName: string | null;
  userEmail: string | null;
}

interface Agent {
  id: string;
  name: string;
  ownerId: string;
  description: string | null;
}

interface Deliverable {
  key: string;
  title: string;
  workstream: string;
  format?: string;
  estimatedHours?: number;
  skills?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MEMBER_COLORS = [
  'bg-accent-squad',
  'bg-accent-agent',
  'bg-accent-client',
  'bg-success',
  'bg-warning',
  'bg-error',
  'bg-escrow',
];

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(1);
}

function percentToBps(pct: number): number {
  return Math.round(pct * 100);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getInitial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-bg-secondary text-text-secondary',
  forming: 'bg-bg-secondary text-text-secondary',
  under_review: 'bg-warning/10 text-warning',
  proposed: 'bg-warning/10 text-warning',
  changes_requested: 'bg-error/10 text-error',
  ratified: 'bg-success/10 text-success',
  submitted: 'bg-accent-client/10 text-accent-client',
  accepted: 'bg-success/10 text-success',
};

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DeliverableCard({
  deliverable,
  claims,
  comments,
  currentUserId,
  members,
  agents,
  isEditable,
  onClaim,
  onWithdraw,
  onUpdateBps,
  onSuggestAgent,
  onAddComment,
}: {
  deliverable: Deliverable;
  claims: Claim[];
  comments: BidComment[];
  currentUserId: string;
  members: SquadMember[];
  agents: Agent[];
  isEditable: boolean;
  onClaim: (key: string, note: string, bps: number) => void;
  onWithdraw: (claimId: string) => void;
  onUpdateBps: (claimId: string, bps: number) => void;
  onSuggestAgent: (key: string, agentId: string, bps: number) => void;
  onAddComment: (key: string, content: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [claimBps, setClaimBps] = useState(500);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  const myClaim = claims.find(c => c.userId === currentUserId && !c.agentId);
  const isContested = claims.length > 1;

  function handleSubmitComment() {
    if (!commentText.trim()) return;
    onAddComment(deliverable.key, commentText.trim());
    setCommentText('');
  }

  function handleClaim() {
    onClaim(deliverable.key, claimNote, claimBps);
    setClaimNote('');
    setClaimBps(500);
    setShowClaimForm(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-primary">{deliverable.title}</h3>
            {deliverable.format && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary uppercase tracking-wider">
                {deliverable.format}
              </span>
            )}
            {deliverable.estimatedHours != null && (
              <span className="text-xs text-text-muted">{deliverable.estimatedHours}h</span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">{deliverable.workstream}</p>
        </div>
        {isContested && (
          <span className="shrink-0 flex items-center gap-1 text-xs text-warning font-medium">
            <span className="w-2 h-2 rounded-full bg-warning" />
            Contested
          </span>
        )}
      </div>

      {/* Skills */}
      {deliverable.skills && deliverable.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {deliverable.skills.map(s => (
            <SkillBadge key={s} name={s} size="sm" />
          ))}
        </div>
      )}

      {/* Claims */}
      {claims.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Claims</p>
          {claims.map(claim => {
            const isMine = claim.userId === currentUserId && !claim.agentId;
            return (
              <div
                key={claim.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${isMine ? 'bg-accent-squad/5 border border-accent-squad/20' : 'bg-bg-primary'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    claim.isAgent ? 'bg-accent-agent' : 'bg-accent-squad'
                  }`}
                >
                  {claim.isAgent ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    getInitial(claim.assigneeName)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">{claim.assigneeName}</span>
                    {claim.isAgent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-agent/10 text-accent-agent font-medium">AI</span>
                    )}
                  </div>
                  {claim.note && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{claim.note}</p>
                  )}
                </div>

                {/* Percentage */}
                <div className="flex items-center gap-2 shrink-0">
                  {isMine && isEditable ? (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={Number(bpsToPercent(claim.paymentShareBps))}
                      onChange={e => onUpdateBps(claim.id, percentToBps(Number(e.target.value)))}
                      className="w-16 text-sm text-center px-2 py-1 border border-border rounded-lg bg-bg-primary focus:ring-2 focus:ring-accent-agent/40 focus:outline-none font-mono"
                    />
                  ) : (
                    <span className="text-sm font-mono font-semibold text-text-primary">
                      {bpsToPercent(claim.paymentShareBps)}%
                    </span>
                  )}

                  {isMine && isEditable && (
                    <button
                      onClick={() => onWithdraw(claim.id)}
                      className="text-xs text-error hover:text-error/80 font-medium"
                    >
                      Withdraw
                    </button>
                  )}
                </div>

                <span className="text-[10px] text-text-muted shrink-0">{timeAgo(claim.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Claim form */}
      {isEditable && !myClaim && (
        <>
          {showClaimForm ? (
            <div className="p-4 bg-bg-primary rounded-xl space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-secondary mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={claimNote}
                    onChange={e => setClaimNote(e.target.value)}
                    placeholder="Why you're claiming this..."
                    className="w-full px-3 py-2 border border-border rounded-xl bg-white text-sm focus:ring-2 focus:ring-accent-agent/40 focus:outline-none"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-text-secondary mb-1">Share %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={claimBps / 100}
                    onChange={e => setClaimBps(percentToBps(Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-white text-sm text-center font-mono focus:ring-2 focus:ring-accent-agent/40 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClaim}
                  className="px-4 py-2 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover transition-colors"
                >
                  Claim
                </button>
                <button
                  onClick={() => setShowClaimForm(false)}
                  className="px-4 py-2 border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowClaimForm(true)}
                className="px-4 py-2 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover transition-colors"
              >
                Claim This
              </button>
              {agents.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                    className="px-4 py-2 border border-accent-agent text-accent-agent rounded-xl text-sm font-medium hover:bg-accent-agent/5 transition-colors"
                  >
                    Suggest Agent
                  </button>
                  {showAgentDropdown && (
                    <div className="absolute z-10 top-full left-0 mt-1 w-56 bg-white rounded-xl border border-border shadow-lg py-1">
                      {agents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => {
                            onSuggestAgent(deliverable.key, agent.id, 500);
                            setShowAgentDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-secondary flex items-center gap-2"
                        >
                          <span className="w-5 h-5 rounded-full bg-accent-agent flex items-center justify-center text-white text-[10px]">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <span className="truncate">{agent.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Comments toggle */}
      <button
        onClick={() => setShowComments(!showComments)}
        className="text-xs text-text-secondary hover:text-text-primary font-medium"
      >
        {showComments ? 'Hide' : 'Show'} Comments ({comments.length})
      </button>

      {showComments && (
        <div className="space-y-2 pl-2 border-l-2 border-border">
          {comments.map(c => (
            <div key={c.id} className="text-sm">
              <span className="font-medium text-text-primary">{c.authorDisplayName}</span>
              <span className="text-text-muted text-xs ml-2">{timeAgo(c.createdAt)}</span>
              <p className="text-text-secondary mt-0.5">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-xs text-text-muted italic">No comments yet</p>
          )}
          {isEditable && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-1.5 border border-border rounded-xl bg-bg-primary text-sm focus:ring-2 focus:ring-accent-agent/40 focus:outline-none"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="px-3 py-1.5 bg-accent-agent text-white rounded-xl text-xs font-medium hover:bg-accent-agent-hover disabled:opacity-40 transition-colors"
              >
                Send
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SplitOverview({
  claims,
  treasuryBps,
  members,
  isEditable,
  onTreasuryChange,
}: {
  claims: Claim[];
  treasuryBps: number;
  members: SquadMember[];
  isEditable: boolean;
  onTreasuryChange: (bps: number) => void;
}) {
  // Aggregate by assignee
  const byAssignee: Record<string, { name: string; bps: number; isAgent: boolean }> = {};
  for (const claim of claims) {
    const key = claim.agentId || claim.userId || 'unknown';
    if (!byAssignee[key]) {
      byAssignee[key] = { name: claim.assigneeName, bps: 0, isAgent: claim.isAgent };
    }
    byAssignee[key].bps += claim.paymentShareBps;
  }

  const entries = Object.entries(byAssignee).sort((a, b) => b[1].bps - a[1].bps);
  const totalAssignedBps = claims.reduce((sum, c) => sum + c.paymentShareBps, 0);
  const totalBps = totalAssignedBps + treasuryBps;
  const remainingBps = 10000 - totalBps;
  const isReady = totalBps === 10000;

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Split Overview</h2>
        {isReady ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-success">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Total: 100%
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-warning">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {remainingBps > 0 ? `${bpsToPercent(remainingBps)}% unallocated` : `${bpsToPercent(Math.abs(remainingBps))}% over`}
          </span>
        )}
      </div>

      {/* Bar chart */}
      <div className="w-full h-8 bg-bg-secondary rounded-full overflow-hidden flex">
        {/* Treasury */}
        {treasuryBps > 0 && (
          <div
            className="bg-accent-client h-full flex items-center justify-center text-[10px] text-white font-medium shrink-0 transition-all duration-300"
            style={{ width: `${(treasuryBps / 10000) * 100}%` }}
            title={`Treasury: ${bpsToPercent(treasuryBps)}%`}
          >
            {treasuryBps >= 500 && `${bpsToPercent(treasuryBps)}%`}
          </div>
        )}
        {entries.map(([key, entry], i) => (
          <div
            key={key}
            className={`${MEMBER_COLORS[i % MEMBER_COLORS.length]} h-full flex items-center justify-center text-[10px] text-white font-medium shrink-0 transition-all duration-300`}
            style={{ width: `${(entry.bps / 10000) * 100}%` }}
            title={`${entry.name}: ${bpsToPercent(entry.bps)}%`}
          >
            {entry.bps >= 500 && `${bpsToPercent(entry.bps)}%`}
          </div>
        ))}
        {remainingBps > 0 && (
          <div
            className="h-full bg-bg-secondary"
            style={{ width: `${(remainingBps / 10000) * 100}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-accent-client shrink-0" />
          <span className="text-text-secondary">Treasury: {bpsToPercent(treasuryBps)}%</span>
        </div>
        {entries.map(([key, entry], i) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${MEMBER_COLORS[i % MEMBER_COLORS.length]} shrink-0`} />
            <span className="text-text-secondary">
              {entry.name}: {bpsToPercent(entry.bps)}%
              {entry.isAgent && ' (AI)'}
            </span>
          </div>
        ))}
        {remainingBps > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-bg-secondary border border-border shrink-0" />
            <span className="text-text-muted">Unallocated: {bpsToPercent(remainingBps)}%</span>
          </div>
        )}
      </div>

      {/* Treasury slider */}
      {isEditable && (
        <div className="pt-2 border-t border-border">
          <label className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-text-secondary">Treasury Share</span>
            <span className="font-mono text-text-primary">{bpsToPercent(treasuryBps)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={5000}
            step={100}
            value={treasuryBps}
            onChange={e => onTreasuryChange(Number(e.target.value))}
            className="w-full accent-accent-client"
          />
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DiscussionThread({
  comments,
  isEditable,
  onAddComment,
}: {
  comments: BidComment[];
  isEditable: boolean;
  onAddComment: (content: string) => void;
}) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  function handleSend() {
    if (!text.trim()) return;
    onAddComment(text.trim());
    setText('');
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">Discussion</h2>

      <div ref={scrollRef} className="max-h-80 overflow-y-auto space-y-3 pr-1">
        {comments.length === 0 && (
          <p className="text-sm text-text-muted italic text-center py-4">No messages yet. Start the conversation.</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-accent-squad flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
              {getInitial(c.authorDisplayName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-text-primary">{c.authorDisplayName}</span>
                <span className="text-[10px] text-text-muted">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {isEditable && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-3.5 py-2 border border-border rounded-xl bg-bg-primary text-sm focus:ring-2 focus:ring-accent-agent/40 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="px-4 py-2 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover disabled:opacity-40 transition-colors"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BidCollaboratePage() {
  const { bidId } = useParams<{ bidId: string }>();
  const router = useRouter();

  // Data state
  const [bid, setBid] = useState<BidData | null>(null);
  const [scope, setScope] = useState<ScopeData | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [comments, setComments] = useState<BidComment[]>([]);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  // Editable fields
  const [approach, setApproach] = useState('');
  const [price, setPrice] = useState('');
  const [upfrontPercent, setUpfrontPercent] = useState(30);
  const [treasuryBps, setTreasuryBps] = useState(2000);
  const [savingBid, setSavingBid] = useState(false);
  const [proposing, setProposing] = useState(false);

  // Debounce timer ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ------ Derive deliverables from scope work plan if not yet loaded from claims API ------
  const effectiveDeliverables: Deliverable[] = deliverables.length > 0 ? deliverables : (() => {
    const result: Deliverable[] = [];
    if (scope?.workPlan?.workstreams) {
      let idx = 0;
      for (const ws of scope.workPlan.workstreams) {
        for (const del of ws.deliverables || []) {
          result.push({
            key: String(idx),
            title: del.title,
            workstream: ws.title,
            format: del.format,
            estimatedHours: del.estimatedEffortHours || del.estimatedHours,
            skills: del.requiredSkills || del.skills,
          });
          idx++;
        }
      }
    }
    return result;
  })();

  const isEditable = bid?.status === 'draft' || bid?.status === 'forming' || bid?.status === 'changes_requested';
  const isProposed = bid?.status === 'under_review' || bid?.status === 'proposed';
  const isRatified = bid?.status === 'ratified';
  const isSubmitted = bid?.status === 'submitted' || bid?.status === 'accepted';

  // ------ Fetch helpers ------

  const fetchBid = useCallback(async () => {
    try {
      const res = await fetch(`/api/bids/${bidId}`);
      if (!res.ok) return;
      const data = await res.json();
      setBid(data);
      setApproach(data.approach || '');
      setPrice(data.proposedPrice || '');
      setUpfrontPercent(data.paymentSchedule?.upfrontPercent ?? 30);
      setTreasuryBps(data.treasuryShareBps ?? 2000);
      setCurrentUserId(data._currentUserId || '');

      // Fetch scope
      const scopeRes = await fetch(`/api/scopes/${data.scopeId}`);
      if (scopeRes.ok) {
        const scopeData = await scopeRes.json();
        setScope(scopeData);
      }

      // Fetch squad data
      const [membersRes, agentsRes] = await Promise.all([
        fetch(`/api/squads/${data.squadId}/members`),
        fetch(`/api/squads/${data.squadId}/agents`),
      ]);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
        // Infer current user from the member list (the session's userId)
        // We get it from the bid's _currentUserId or match in members
      }
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData);
      }
    } catch (err) {
      console.error('Failed to load bid:', err);
    }
  }, [bidId]);

  const fetchClaims = useCallback(async () => {
    try {
      const res = await fetch(`/api/bids/${bidId}/claims`);
      if (res.ok) {
        const data = await res.json();
        // API returns { deliverables: [...], summary: {...} }
        // Flatten nested claims into a flat Claim[] and extract deliverable info
        if (data.deliverables && Array.isArray(data.deliverables)) {
          const flatClaims: Claim[] = [];
          const delList: Deliverable[] = [];
          for (const del of data.deliverables) {
            delList.push({
              key: del.key,
              title: del.title,
              workstream: del.workstream || '',
              format: del.format,
              estimatedHours: del.estimatedHours,
              skills: del.requiredSkills || del.skills,
            });
            if (del.claims && Array.isArray(del.claims)) {
              for (const c of del.claims) {
                flatClaims.push({
                  id: c.id,
                  bidId: bidId,
                  deliverableKey: del.key,
                  userId: c.userId || null,
                  agentId: c.agentId || null,
                  paymentShareBps: c.proposedBps || c.paymentShareBps || 0,
                  note: c.note || null,
                  createdAt: c.createdAt || '',
                  assigneeName: c.userName || c.assigneeName || c.agentName || 'Unknown',
                  isAgent: !!c.agentId,
                });
              }
            }
          }
          setClaims(flatClaims);
          setDeliverables(delList);
        } else if (Array.isArray(data)) {
          // Fallback: plain array of claims
          setClaims(data);
        }
      }
    } catch { /* ignore */ }
  }, [bidId]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/bids/${bidId}/comments`);
      if (res.ok) {
        const data = await res.json();
        // API returns { comments: [...], grouped: {...} }
        if (data.comments && Array.isArray(data.comments)) {
          setComments(data.comments);
        } else if (Array.isArray(data)) {
          setComments(data);
        }
      }
    } catch { /* ignore */ }
  }, [bidId]);

  // ------ Initial load ------
  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchBid();
      await Promise.all([fetchClaims(), fetchComments()]);

      // Also figure out current user id from session check
      try {
        const meRes = await fetch('/api/me');
        if (meRes.ok) {
          const me = await meRes.json();
          setCurrentUserId(me.userId || me.id || '');
        }
      } catch { /* ignore */ }

      setLoading(false);
    }
    load();
  }, [fetchBid, fetchClaims, fetchComments]);

  // ------ Polling ------
  useEffect(() => {
    const claimInterval = setInterval(fetchClaims, 5000);
    const commentInterval = setInterval(fetchComments, 5000);
    const bidInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/bids/${bidId}`);
        if (res.ok) {
          const data = await res.json();
          setBid(data);
        }
      } catch { /* ignore */ }
    }, 10000);

    return () => {
      clearInterval(claimInterval);
      clearInterval(commentInterval);
      clearInterval(bidInterval);
    };
  }, [bidId, fetchClaims, fetchComments]);

  // ------ Actions ------

  const saveBid = useCallback(async (fields: Record<string, unknown>) => {
    setSavingBid(true);
    try {
      const res = await fetch(`/api/bids/${bidId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const updated = await res.json();
        setBid(updated);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSavingBid(false);
    }
  }, [bidId]);

  function debouncedSave(fields: Record<string, unknown>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveBid(fields), 2000);
  }

  function handleApproachChange(value: string) {
    setApproach(value);
    debouncedSave({ approach: value });
  }

  function handlePriceChange(value: string) {
    setPrice(value);
    debouncedSave({ proposedPrice: value });
  }

  function handleUpfrontChange(value: number) {
    setUpfrontPercent(value);
    debouncedSave({ paymentSchedule: { upfrontPercent: value, finalPercent: 100 - value } });
  }

  function handleTreasuryChange(bps: number) {
    setTreasuryBps(bps);
    debouncedSave({ treasuryShareBps: bps });
  }

  async function handleClaim(deliverableKey: string, note: string, paymentShareBps: number) {
    try {
      const res = await fetch(`/api/bids/${bidId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableKey, note, proposedBps: paymentShareBps }),
      });
      if (res.ok) {
        toast.success('Deliverable claimed');
        fetchClaims();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to claim');
      }
    } catch {
      toast.error('Failed to claim deliverable');
    }
  }

  async function handleWithdraw(claimId: string) {
    try {
      const res = await fetch(`/api/bids/${bidId}/claims?claimId=${claimId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Claim withdrawn');
        fetchClaims();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to withdraw');
      }
    } catch {
      toast.error('Failed to withdraw claim');
    }
  }

  async function handleUpdateBps(claimId: string, paymentShareBps: number) {
    try {
      // Find the claim to get its deliverableKey — POST upserts existing claims
      const claim = claims.find(c => c.id === claimId);
      if (!claim) return;
      const res = await fetch(`/api/bids/${bidId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableKey: claim.deliverableKey, proposedBps: paymentShareBps }),
      });
      if (res.ok) {
        fetchClaims();
      }
    } catch { /* ignore */ }
  }

  async function handleSuggestAgent(deliverableKey: string, agentId: string, paymentShareBps: number) {
    try {
      const res = await fetch(`/api/bids/${bidId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableKey, agentId, proposedBps: paymentShareBps }),
      });
      if (res.ok) {
        toast.success('Agent suggested');
        fetchClaims();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to suggest agent');
      }
    } catch {
      toast.error('Failed to suggest agent');
    }
  }

  async function handleAddComment(deliverableKey: string | null, content: string) {
    try {
      const res = await fetch(`/api/bids/${bidId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, deliverableKey }),
      });
      if (res.ok) {
        fetchComments();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to post comment');
      }
    } catch {
      toast.error('Failed to post comment');
    }
  }

  async function handleProposeFinalize() {
    setProposing(true);
    try {
      // Flush any pending save
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        await saveBid({
          approach,
          proposedPrice: price,
          paymentSchedule: { upfrontPercent, finalPercent: 100 - upfrontPercent },
          treasuryShareBps: treasuryBps,
        });
      }

      const res = await fetch(`/api/bids/${bidId}/propose-finalize`, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        if (data.autoRatified) {
          toast.success('Bid auto-ratified! Ready to submit.');
        } else {
          toast.success('Proposed for squad vote!');
        }
        setBid(data);
      } else {
        if (data.issues) {
          for (const issue of data.issues) {
            toast.error(issue);
          }
        } else {
          toast.error(data.error || 'Failed to propose');
        }
      }
    } catch {
      toast.error('Failed to propose finalization');
    } finally {
      setProposing(false);
    }
  }

  async function handleSubmitToClient() {
    try {
      const res = await fetch(`/api/bids/${bidId}/submit`, { method: 'POST' });
      if (res.ok) {
        toast.success('Bid submitted to client!');
        const updated = await res.json();
        setBid(updated);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to submit');
      }
    } catch {
      toast.error('Failed to submit bid');
    }
  }

  // ------ Finalization readiness checklist ------
  const totalBps = claims.reduce((sum, c) => sum + c.paymentShareBps, 0) + treasuryBps;
  const unclaimedDeliverables = effectiveDeliverables.filter(d => !claims.some(c => c.deliverableKey === d.key));
  const contestedDeliverables = effectiveDeliverables.filter(
    d => claims.filter(c => c.deliverableKey === d.key).length > 1
  );

  const checklist = [
    { label: 'All deliverables claimed', ok: effectiveDeliverables.length > 0 && unclaimedDeliverables.length === 0 },
    { label: 'No contested claims', ok: contestedDeliverables.length === 0 },
    { label: 'Total split = 100%', ok: totalBps === 10000 },
    { label: 'Approach filled in', ok: approach.trim().length > 0 },
    { label: 'Price set', ok: Number(price) > 0 },
  ];
  const allReady = checklist.every(c => c.ok);

  // ------ Render ------

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-bg-secondary rounded animate-pulse" />
        <div className="h-4 w-40 bg-bg-secondary rounded animate-pulse" />
        <div className="grid gap-4 mt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-border p-6 space-y-3">
              <div className="h-5 w-3/4 bg-bg-secondary rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-bg-secondary rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h2 className="text-lg font-semibold text-text-primary">Bid not found</h2>
        <p className="text-sm text-text-secondary mt-2">This bid may have been deleted or you may not have access.</p>
        <Link href="/bids" className="text-accent-agent hover:text-accent-agent-hover text-sm mt-4 inline-block">
          Back to Bids
        </Link>
      </div>
    );
  }

  const generalComments = comments.filter(c => !c.deliverableKey);

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* ---- Header ---- */}
      <div className="mb-8">
        <Link
          href={`/bids/${bidId}`}
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Bid
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Bid for: {scope?.title || 'Loading...'}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Collaboration workspace
              {members.length > 0 && (
                <> &middot; {members.length} member{members.length !== 1 && 's'}</>
              )}
            </p>
          </div>
          <StatusBadge status={bid.status} />
        </div>
      </div>

      {/* ---- Status Banners ---- */}
      {isProposed && (
        <div className="mb-6 p-4 bg-warning/5 border border-warning/20 rounded-2xl flex items-center gap-3">
          <svg className="w-5 h-5 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Awaiting Squad Votes</p>
            <p className="text-xs text-text-secondary">
              This bid has been proposed for finalization. Squad members are reviewing.
            </p>
          </div>
          <Link
            href={`/bids/${bidId}/vote`}
            className="px-4 py-2 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover transition-colors shrink-0"
          >
            Go to Vote
          </Link>
        </div>
      )}

      {bid.status === 'changes_requested' && (
        <div className="mb-6 p-4 bg-error/5 border border-error/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium text-error">Changes Requested</p>
          </div>
          <p className="text-xs text-text-secondary">
            The squad requested changes during review. Make the necessary adjustments and propose again.
          </p>
        </div>
      )}

      {isSubmitted && (
        <div className="mb-6 p-4 bg-success/5 border border-success/20 rounded-2xl flex items-center gap-3">
          <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {bid.status === 'accepted' ? 'Bid Accepted by Client!' : 'Bid Submitted to Client'}
            </p>
            <p className="text-xs text-text-secondary">
              {bid.status === 'accepted'
                ? 'Congratulations! A contract will be created shortly.'
                : 'The client is reviewing your bid.'}
            </p>
          </div>
        </div>
      )}

      {/* ---- Deliverable Claims ---- */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Deliverable Claims
          {effectiveDeliverables.length > 0 && (
            <span className="text-sm font-normal text-text-muted ml-2">
              ({claims.length} claim{claims.length !== 1 && 's'} across {effectiveDeliverables.length} deliverable{effectiveDeliverables.length !== 1 && 's'})
            </span>
          )}
        </h2>

        {effectiveDeliverables.length === 0 && (
          <div className="bg-white rounded-2xl border border-border p-8 text-center">
            <p className="text-sm text-text-muted">
              No work plan deliverables found for this scope. The scope may not have a structured work plan yet.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {effectiveDeliverables.map(d => (
            <DeliverableCard
              key={d.key}
              deliverable={d}
              claims={claims.filter(c => c.deliverableKey === d.key)}
              comments={comments.filter(c => c.deliverableKey === d.key)}
              currentUserId={currentUserId}
              members={members}
              agents={agents}
              isEditable={!!isEditable}
              onClaim={handleClaim}
              onWithdraw={handleWithdraw}
              onUpdateBps={handleUpdateBps}
              onSuggestAgent={handleSuggestAgent}
              onAddComment={(key, content) => handleAddComment(key, content)}
            />
          ))}
        </div>
      </section>

      {/* ---- Split Overview ---- */}
      <section className="mb-8">
        <SplitOverview
          claims={claims}
          treasuryBps={treasuryBps}
          members={members}
          isEditable={!!isEditable}
          onTreasuryChange={handleTreasuryChange}
        />
      </section>

      {/* ---- Approach & Terms ---- */}
      <section className="mb-8">
        <div className="bg-white rounded-2xl border border-border p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Approach & Terms</h2>
            {savingBid && (
              <span className="text-xs text-text-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-agent animate-pulse" />
                Saving...
              </span>
            )}
          </div>

          {/* Approach */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Approach</label>
            {isEditable ? (
              <textarea
                value={approach}
                onChange={e => handleApproachChange(e.target.value)}
                rows={5}
                placeholder="Describe your team's approach to this project..."
                className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-bg-primary text-sm text-text-primary focus:ring-2 focus:ring-accent-agent/40 focus:outline-none resize-y leading-relaxed"
              />
            ) : (
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap bg-bg-primary p-4 rounded-xl">
                {approach || 'No approach described yet.'}
              </p>
            )}
          </div>

          {/* Price + Upfront */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Price (USDC)
              </label>
              {isEditable ? (
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={price}
                    onChange={e => handlePriceChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3.5 py-2.5 border border-border rounded-xl bg-bg-primary text-sm font-mono text-text-primary focus:ring-2 focus:ring-accent-agent/40 focus:outline-none"
                  />
                </div>
              ) : (
                <p className="text-2xl font-bold text-text-primary">
                  {price ? `$${Number(price).toLocaleString()}` : '--'}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium text-text-secondary mb-1.5">
                <span>Upfront Payment</span>
                <span className="font-mono text-text-primary">{upfrontPercent}%</span>
              </label>
              {isEditable ? (
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={upfrontPercent}
                  onChange={e => handleUpfrontChange(Number(e.target.value))}
                  className="w-full accent-accent-squad mt-2"
                />
              ) : (
                <div className="w-full bg-bg-secondary rounded-full h-3 mt-2">
                  <div
                    className="bg-accent-squad h-3 rounded-full transition-all"
                    style={{ width: `${upfrontPercent}%` }}
                  />
                </div>
              )}
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Discussion ---- */}
      <section className="mb-8">
        <DiscussionThread
          comments={generalComments}
          isEditable={!!isEditable || isProposed}
          onAddComment={content => handleAddComment(null, content)}
        />
      </section>

      {/* ---- Actions ---- */}
      <section>
        {isEditable && (
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Propose to Finalize</h2>

            {/* Checklist */}
            <div className="space-y-2">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  {item.ok ? (
                    <svg className="w-4.5 h-4.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    </svg>
                  )}
                  <span className={item.ok ? 'text-text-primary' : 'text-text-muted'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Unclaimed deliverables warning */}
            {unclaimedDeliverables.length > 0 && (
              <div className="text-xs text-warning bg-warning/5 p-3 rounded-xl">
                <span className="font-medium">Unclaimed:</span>{' '}
                {unclaimedDeliverables.map(d => d.title).join(', ')}
              </div>
            )}

            {/* Contested claims warning */}
            {contestedDeliverables.length > 0 && (
              <div className="text-xs text-warning bg-warning/5 p-3 rounded-xl">
                <span className="font-medium">Contested:</span>{' '}
                {contestedDeliverables.map(d => d.title).join(', ')} — resolve before finalizing
              </div>
            )}

            <button
              onClick={handleProposeFinalize}
              disabled={!allReady || proposing}
              className="w-full px-6 py-3 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {proposing ? 'Proposing...' : 'Propose to Finalize'}
            </button>
          </div>
        )}

        {isRatified && (
          <div className="bg-success/5 border border-success/20 rounded-2xl p-6 text-center space-y-3">
            <svg className="w-10 h-10 text-success mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold text-success">Bid Ratified by Squad</p>
            <p className="text-sm text-text-secondary">
              Your squad has approved this bid. Submit it to the client to start the engagement.
            </p>
            <button
              onClick={handleSubmitToClient}
              className="px-8 py-3 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover transition-colors"
            >
              Submit Bid to Client
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
