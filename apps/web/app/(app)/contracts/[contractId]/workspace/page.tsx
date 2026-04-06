'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DndContext, DragOverlay, closestCorners, useDroppable, useDraggable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// ── Types ──

interface DeliverableMember {
  id: string;
  displayName: string;
  avatarUrl?: string;
}
interface DeliverableAgent {
  id: string;
  name: string;
}
interface Deliverable {
  id: string;
  title: string;
  format: string;
  status: string;
  assignedMember: DeliverableMember | null;
  assignedAgent: DeliverableAgent | null;
  estimatedEffortHours: number | null;
  dueDate: string | null;
  fileCount: number;
}
interface Workstream {
  id: string;
  title: string;
  orderIndex: number;
  status: string;
  deliverables: Deliverable[];
}
interface BoardData {
  workstreams: Workstream[];
  columns: string[];
  stats: { total: number; completed: number; inProgress: number; blocked: number };
}
interface Message {
  id: string;
  content: string;
  author: string;
  isAgent: boolean;
  channelType: string;
  channelId: string | null;
  createdAt: string;
}
interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorName?: string;
  isAgent?: boolean;
}
interface MilestoneDeliverable {
  id: string;
  title: string;
  status: string;
  amount: number;
  paid: boolean;
  releaseTxHash: string | null;
  releasedAt: string | null;
}
interface PaymentStatus {
  totalAmount: number;
  summary: { totalReleased: number; remaining: number; percentComplete: number; approvedCount: number; totalDeliverables: number };
  upfront: { percentage: number; amount: number; paid: boolean };
  depositTxHash: string | null;
  milestones: { pool: number; deliverables: MilestoneDeliverable[] };
}
interface AgentQueueItem {
  id: string;
  agentId: string;
  agentName?: string;
  actionType: string;
  actionPayload: Record<string, unknown>;
  status: string;
  createdAt: string;
}
interface ContractInfo {
  id: string;
  title: string;
  status: string;
  clientId: string;
  squadId: string;
  totalAmount: string;
}

// ── Status styling ──

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-bg-secondary text-text-secondary',
  in_progress: 'bg-accent-agent/10 text-accent-agent',
  in_review: 'bg-warning/10 text-warning',
  revision_requested: 'bg-error/10 text-error',
  approved: 'bg-success/10 text-success',
  blocked: 'bg-error/10 text-error',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  in_review: 'In Review',
  revision_requested: 'Revision',
  approved: 'Approved',
  blocked: 'Blocked',
};

const COLUMN_ORDER = ['not_started', 'in_progress', 'in_review', 'revision_requested', 'approved', 'blocked'];

// ── Main Component ──

type Tab = 'board' | 'messages' | 'agents' | 'payments' | 'activity';

export default function WorkspacePage() {
  const { contractId } = useParams<{ contractId: string }>();
  const [tab, setTab] = useState<Tab>('board');
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/contracts/${contractId}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setContract(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contractId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold mb-2">Contract not found</h2>
        <Link href="/contracts" className="text-accent-agent hover:underline text-sm">Back to contracts</Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'board', label: 'Board', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
    { key: 'messages', label: 'Messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { key: 'agents', label: 'Agents', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { key: 'payments', label: 'Payments', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'activity', label: 'Activity', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/contracts/${contractId}`} className="text-text-secondary hover:text-text-primary text-sm">
              <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-xl font-bold">{contract.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[contract.status] || 'bg-bg-secondary text-text-secondary'}`}>
              {contract.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-accent-squad text-accent-squad'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} /></svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'board' && <BoardView contractId={contractId} />}
      {tab === 'messages' && <MessagesView contractId={contractId} />}
      {tab === 'agents' && <AgentsView contractId={contractId} />}
      {tab === 'payments' && <PaymentsView contractId={contractId} />}
      {tab === 'activity' && <ActivityView contractId={contractId} />}
    </div>
  );
}

// ── Board View (Kanban) ──

type DeliverableWithWorkstream = Deliverable & { workstream: string };

function BoardView({ contractId }: { contractId: string }) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const fetchBoard = useCallback(() => {
    fetch(`/api/contracts/${contractId}/board`)
      .then(r => r.json())
      .then(d => { if (!d.error) setBoard(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contractId]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  if (loading) return <LoadingSpinner />;
  if (!board) return <EmptyState message="Could not load board data" />;

  // Group all deliverables by status
  const allDeliverables: DeliverableWithWorkstream[] = board.workstreams.flatMap(ws =>
    ws.deliverables.map(d => ({ ...d, workstream: ws.title }))
  );
  const columns = COLUMN_ORDER.filter(col =>
    allDeliverables.some(d => d.status === col) || ['not_started', 'in_progress', 'in_review', 'approved'].includes(col)
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const deliverableId = active.id as string;
    const newStatus = over.id as string;
    const deliverable = allDeliverables.find(d => d.id === deliverableId);
    if (!deliverable || deliverable.status === newStatus) return;

    // Optimistic update
    setBoard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        workstreams: prev.workstreams.map(ws => ({
          ...ws,
          deliverables: ws.deliverables.map(d =>
            d.id === deliverableId ? { ...d, status: newStatus } : d
          ),
        })),
      };
    });

    try {
      const res = await fetch(`/api/contracts/${contractId}/deliverables/${deliverableId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        // Revert on failure
        fetchBoard();
      }
    } catch {
      fetchBoard();
    }
  }

  const activeDeliverable = activeId ? allDeliverables.find(d => d.id === activeId) : null;

  return (
    <div>
      {/* Stats bar */}
      <div className="flex gap-4 mb-6">
        {[
          { label: 'Total', value: board.stats.total, color: 'text-text-primary' },
          { label: 'In Progress', value: board.stats.inProgress, color: 'text-accent-agent' },
          { label: 'Completed', value: board.stats.completed, color: 'text-success' },
          { label: 'Blocked', value: board.stats.blocked, color: 'text-error' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-border px-4 py-3">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban columns with DnD */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(col => {
            const items = allDeliverables.filter(d => d.status === col);
            return (
              <DroppableColumn key={col} id={col} title={STATUS_LABELS[col] || col} count={items.length} statusColor={STATUS_COLORS[col] || ''}>
                {items.map(d => (
                  <DraggableCard key={d.id} deliverable={d} />
                ))}
              </DroppableColumn>
            );
          })}
        </div>
        <DragOverlay>
          {activeDeliverable ? <DeliverableCard deliverable={activeDeliverable} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── Droppable Column ──

function DroppableColumn({
  id,
  title,
  count,
  statusColor,
  children,
}: {
  id: string;
  title: string;
  count: number;
  statusColor: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
          {title}
        </span>
        <span className="text-xs text-text-muted">{count}</span>
      </div>
      <div
        className={`min-h-[200px] p-3 rounded-xl border transition-colors ${
          isOver
            ? 'border-accent-squad/40 bg-accent-squad/5 border-dashed'
            : 'border-border bg-bg-secondary/50'
        }`}
      >
        <div className="space-y-3">
          {children}
          {count === 0 && !isOver && (
            <div className="text-xs text-text-muted text-center py-8">
              No items
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Draggable Card ──

function DraggableCard({ deliverable }: { deliverable: DeliverableWithWorkstream }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deliverable.id,
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`transition-opacity ${isDragging ? 'opacity-30' : ''}`}
    >
      <DeliverableCard deliverable={deliverable} />
    </div>
  );
}

// ── Deliverable Card (shared between draggable and overlay) ──

function DeliverableCard({
  deliverable: d,
  isDragOverlay = false,
}: {
  deliverable: DeliverableWithWorkstream;
  isDragOverlay?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-border p-4 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragOverlay ? 'shadow-lg rotate-2' : 'hover:shadow-sm'
      }`}
    >
      <div className="text-sm font-medium mb-2">{d.title}</div>
      <div className="text-xs text-text-secondary mb-2">{d.workstream}</div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {d.assignedAgent ? (
            <span className="inline-flex items-center gap-1 text-xs bg-accent-agent/10 text-accent-agent px-1.5 py-0.5 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {d.assignedAgent.name}
            </span>
          ) : d.assignedMember ? (
            <span className="text-xs text-text-secondary">
              {d.assignedMember.displayName}
            </span>
          ) : (
            <span className="text-xs text-text-muted italic">Unassigned</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {d.estimatedEffortHours && <span>{d.estimatedEffortHours}h</span>}
          {d.fileCount > 0 && (
            <span className="flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              {d.fileCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Messages View ──

function MessagesView({ contractId }: { contractId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(() => {
    fetch(`/api/contracts/${contractId}/messages?channelType=${channel}&limit=100`)
      .then(r => r.json())
      .then(d => { if (d.messages) setMessages(d.messages); })
      .catch(() => {});
  }, [contractId, channel]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelType: channel, content: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage('');
        loadMessages();
      }
    } catch {} finally {
      setSending(false);
    }
  }

  const channels = ['general', 'internal', 'clientSquad'];

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      {/* Channel tabs */}
      <div className="flex gap-2 mb-4">
        {channels.map(ch => (
          <button
            key={ch}
            onClick={() => setChannel(ch)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              channel === ch ? 'bg-accent-squad text-white' : 'bg-bg-secondary text-text-secondary hover:bg-bg-primary'
            }`}
          >
            #{ch}
          </button>
        ))}
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-border p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm">No messages yet. Start the conversation!</div>
        )}
        {messages.map(m => (
          <div key={m.id} className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              m.isAgent ? 'bg-accent-agent/15 text-accent-agent' : 'bg-accent-squad/15 text-accent-squad'
            }`}>
              {m.isAgent ? 'AI' : m.author.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium">{m.author}</span>
                {m.isAgent && <span className="text-[10px] bg-accent-agent/10 text-accent-agent px-1.5 py-0.5 rounded-full font-medium">AI Agent</span>}
                <span className="text-xs text-text-muted">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={`Message #${channel}...`}
          className="flex-1 px-4 py-2.5 border border-border rounded-xl bg-bg-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-agent/40"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="px-5 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ── Agents View ──

function AgentsView({ contractId }: { contractId: string }) {
  const [agentQueue, setAgentQueue] = useState<AgentQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/contracts/${contractId}/agent-queue?status=pending`).then(r => r.json()).catch(() => ({ items: [] })),
    ]).then(([queueData]) => {
      if (queueData.items) setAgentQueue(queueData.items);
      else if (Array.isArray(queueData)) setAgentQueue(queueData);
    }).finally(() => setLoading(false));
  }, [contractId]);

  async function handleReview(actionId: string, decision: 'approved' | 'rejected') {
    try {
      await fetch(`/api/contracts/${contractId}/agent-queue/${actionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      setAgentQueue(prev => prev.filter(a => a.id !== actionId));
    } catch {}
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Agent Review Queue</h2>
      {agentQueue.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-text-secondary text-sm">No pending agent actions to review.</p>
          <p className="text-text-muted text-xs mt-1">Agent submissions requiring human approval will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agentQueue.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs bg-accent-agent/10 text-accent-agent px-2 py-0.5 rounded-full font-medium">
                    AI {item.agentName || 'Agent'}
                  </span>
                  <span className="text-sm font-medium capitalize">{item.actionType.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-xs text-text-muted">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-sm text-text-secondary mb-3 bg-bg-secondary rounded-lg p-3">
                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(item.actionPayload, null, 2)}</pre>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(item.id, 'approved')}
                  className="px-4 py-2 bg-success text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(item.id, 'rejected')}
                  className="px-4 py-2 border border-error/30 text-error rounded-lg text-xs font-medium hover:bg-error/5 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Payments View ──

function PaymentsView({ contractId }: { contractId: string }) {
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState('');

  const loadData = useCallback(() => {
    Promise.all([
      fetch(`/api/contracts/${contractId}/payment-status`).then(r => r.json()),
      fetch(`/api/contracts/${contractId}`).then(r => r.json()),
    ]).then(([paymentData, contractData]) => {
      if (!paymentData.error) setPayment(paymentData);
      if (!contractData.error) setContract(contractData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [contractId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRelease(deliverableId: string, amount: number) {
    setReleasingId(deliverableId);
    setReleaseError('');
    try {
      // Generate a stub tx hash for demo (real flow uses wallet on contract page)
      const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      const res = await fetch(`/api/contracts/${contractId}/release-milestone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableId, txHash: mockTxHash }),
      });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        setReleaseError(err.error || 'Failed to release');
      }
    } catch {
      setReleaseError('Network error');
    } finally {
      setReleasingId(null);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!payment) return <EmptyState message="Could not load payment data" />;

  const progressPct = payment.summary.percentComplete;
  const isClient = contract?.clientId === contract?.id; // Will be checked by API anyway

  return (
    <div>
      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Payment Progress</h3>
          <span className="text-sm font-mono text-accent-squad">
            ${payment.summary.totalReleased.toLocaleString()} / ${payment.totalAmount.toLocaleString()} USDC
          </span>
        </div>
        <div className="w-full bg-bg-secondary rounded-full h-3 mb-2">
          <div
            className="bg-accent-squad h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-text-muted">
          <span>{payment.summary.approvedCount} of {payment.summary.totalDeliverables} deliverables approved</span>
          <span>{progressPct}% complete</span>
        </div>
      </div>

      {/* Transaction history */}
      {payment.depositTxHash && (
        <div className="bg-white rounded-xl border border-border p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3">Transaction History</h3>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-sm font-medium">Contract Deposit</span>
            </div>
            <a
              href={`https://sepolia.basescan.org/tx/${payment.depositTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent-agent hover:underline font-mono"
            >
              {payment.depositTxHash.slice(0, 10)}...{payment.depositTxHash.slice(-6)}
            </a>
          </div>
          {payment.milestones?.deliverables?.filter((d: MilestoneDeliverable) => d.releaseTxHash).map((d: MilestoneDeliverable) => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-agent" />
                <span className="text-sm">Milestone: {d.title}</span>
                <span className="text-xs text-text-muted">${d.amount.toLocaleString()}</span>
              </div>
              <a
                href={`https://sepolia.basescan.org/tx/${d.releaseTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-agent hover:underline font-mono"
              >
                {d.releaseTxHash!.slice(0, 10)}...{d.releaseTxHash!.slice(-6)}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-xs text-text-secondary mb-1">Upfront ({payment.upfront.percentage}%)</div>
          <div className="text-lg font-bold">${payment.upfront.amount.toLocaleString()}</div>
          <div className={`text-xs mt-1 ${payment.upfront.paid ? 'text-success' : 'text-text-muted'}`}>
            {payment.upfront.paid ? 'Released' : 'Pending'}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-xs text-text-secondary mb-1">Released</div>
          <div className="text-lg font-bold text-success">${payment.summary.totalReleased.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-xs text-text-secondary mb-1">Remaining in Escrow</div>
          <div className="text-lg font-bold text-escrow">${payment.summary.remaining.toLocaleString()}</div>
        </div>
      </div>

      {/* Milestone breakdown */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold mb-4">Milestone Breakdown</h3>
        {releaseError && <p className="text-xs text-error mb-3">{releaseError}</p>}
        <div className="space-y-2">
          {payment.milestones?.deliverables?.map((d: MilestoneDeliverable) => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${d.releaseTxHash ? 'bg-success' : d.status === 'approved' ? 'bg-accent-agent' : 'bg-border'}`} />
                <span className="text-sm">{d.title}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[d.status] || ''}`}>
                  {STATUS_LABELS[d.status] || d.status}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-mono ${d.releaseTxHash ? 'text-success' : 'text-text-secondary'}`}>
                  ${d.amount.toLocaleString()}
                </span>
                {d.releaseTxHash && (
                  <a
                    href={`https://sepolia.basescan.org/tx/${d.releaseTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-accent-agent hover:underline font-mono"
                  >
                    tx
                  </a>
                )}
                {d.status === 'approved' && !d.releaseTxHash && (
                  <button
                    onClick={() => handleRelease(d.id, d.amount)}
                    disabled={releasingId === d.id}
                    className="px-2.5 py-1 bg-accent-agent text-white rounded-lg text-[10px] font-medium hover:bg-accent-agent-hover disabled:opacity-50 transition-colors"
                  >
                    {releasingId === d.id ? 'Releasing...' : 'Release'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Activity View ──

function ActivityView({ contractId }: { contractId: string }) {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/contracts/${contractId}/activity?limit=50`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setActivity(d);
        else if (d.entries) setActivity(d.entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contractId]);

  if (loading) return <LoadingSpinner />;

  const actionLabels: Record<string, string> = {
    contract_created: 'Created contract',
    contract_funded: 'Funded contract',
    deliverable_approved: 'Approved deliverable',
    deliverable_status_changed: 'Updated deliverable status',
    payment_pending: 'Payment pending',
    milestone_released: 'Released milestone payment',
    contract_completed: 'Completed contract',
    all_deliverables_approved: 'All deliverables approved',
    workstream_completed: 'Completed workstream',
    agent_message_posted: 'Agent posted message',
    agent_action_reviewed: 'Reviewed agent action',
    bid_submitted_for_review: 'Submitted bid for review',
    bid_vote_cast: 'Cast governance vote',
    dispute_raised: 'Raised dispute',
  };

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
      {activity.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">No activity yet</p>
      ) : (
        <div className="space-y-4">
          {activity.map(entry => (
            <div key={entry.id} className="flex gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                entry.isAgent ? 'bg-accent-agent' : 'bg-accent-squad'
              }`} />
              <div>
                <div className="text-sm">
                  <span className="font-medium">{entry.actorName || 'System'}</span>
                  {' '}
                  <span className="text-text-secondary">{actionLabels[entry.action] || entry.action}</span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared Components ──

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-accent-squad border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-text-secondary text-sm">{message}</div>
  );
}
