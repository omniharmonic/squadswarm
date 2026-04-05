'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

// ── Types ──

interface Squad {
  id: string;
  name: string;
  role: string;
  governanceModel?: { type: string; threshold?: number };
}
interface SquadMember {
  id: string;
  userId: string;
  displayName?: string;
  email?: string;
  // API returns userName/userEmail — normalize on fetch
  userName?: string;
  userEmail?: string;
  role: string;
}
interface Agent {
  id: string;
  name: string;
  provider: string;
  model: string;
  capabilities: string[] | null;
}
interface ScopeInfo {
  id: string;
  title: string;
  budgetMin: string | null;
  budgetMax: string | null;
  timelineDays: number | null;
  status: string;
  workPlan?: WorkPlan;
}
interface WorkPlanDeliverable {
  title: string;
  format: string;
  estimatedEffortHours?: number;
  description?: string;
  acceptanceCriteria?: string[];
  requiredSkills?: string[];
}
interface WorkPlanWorkstream {
  title: string;
  deliverables?: WorkPlanDeliverable[];
}
interface WorkPlan {
  workstreams?: WorkPlanWorkstream[];
}
interface Assignment {
  deliverableKey: string;
  deliverableTitle: string;
  userId: string | null;
  agentId: string | null;
  assigneeName: string;
  paymentShareBps: number;
  roleTitle: string;
}

// ── Steps ──

type Step = 'scope' | 'team' | 'payment' | 'approach' | 'review';

const STEPS: { key: Step; label: string; num: number }[] = [
  { key: 'scope', label: 'Scope Review', num: 1 },
  { key: 'team', label: 'Team Assignment', num: 2 },
  { key: 'payment', label: 'Payment Split', num: 3 },
  { key: 'approach', label: 'Approach & Terms', num: 4 },
  { key: 'review', label: 'Review & Submit', num: 5 },
];

function BidBuilderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scopeId = searchParams.get('scopeId');

  const [step, setStep] = useState<Step>('scope');
  const [squads, setSquads] = useState<Squad[]>([]);
  const [scopeInfo, setScopeInfo] = useState<ScopeInfo | null>(null);
  const [scopeLoading, setScopeLoading] = useState(true);
  const [selectedSquadId, setSelectedSquadId] = useState('');
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [treasuryShareBps, setTreasuryShareBps] = useState(2000);
  const [approach, setApproach] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [upfrontPercentage, setUpfrontPercentage] = useState(25);
  const [timelineNotes, setTimelineNotes] = useState('');
  const [bidId, setBidId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load squads
  useEffect(() => {
    fetch('/api/squads')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSquads(d); })
      .catch(() => {});
  }, []);

  // Load scope
  useEffect(() => {
    if (!scopeId) { setScopeLoading(false); return; }
    fetch(`/api/scopes/${scopeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setScopeInfo(d); })
      .catch(() => {})
      .finally(() => setScopeLoading(false));
  }, [scopeId]);

  // Load squad members + agents when squad selected
  useEffect(() => {
    if (!selectedSquadId) return;
    fetch(`/api/squads/${selectedSquadId}/members`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          // Normalize API field names (userName/userEmail → displayName/email)
          setMembers(d.map((m: SquadMember) => ({
            ...m,
            displayName: m.displayName || m.userName || m.userEmail?.split('@')[0] || 'Unknown',
            email: m.email || m.userEmail || '',
          })));
        }
      })
      .catch(() => setMembers([]));
    fetch(`/api/squads/${selectedSquadId}/agents`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAgents(d); })
      .catch(() => setAgents([]));
  }, [selectedSquadId]);

  // Initialize assignments from work plan deliverables
  useEffect(() => {
    if (!scopeInfo?.workPlan?.workstreams) return;
    const newAssignments: Assignment[] = [];
    let idx = 0;
    for (const ws of scopeInfo.workPlan.workstreams) {
      for (const del of ws.deliverables || []) {
        newAssignments.push({
          deliverableKey: `${idx}`,
          deliverableTitle: del.title,
          userId: null,
          agentId: null,
          assigneeName: '',
          paymentShareBps: 0,
          roleTitle: '',
        });
        idx++;
      }
    }
    // Auto-distribute payment evenly (minus treasury)
    const availableBps = 10000 - treasuryShareBps;
    const perDel = newAssignments.length > 0 ? Math.floor(availableBps / newAssignments.length) : 0;
    let remainder = availableBps - perDel * newAssignments.length;
    for (let i = 0; i < newAssignments.length; i++) {
      newAssignments[i]!.paymentShareBps = perDel + (i === 0 ? remainder : 0);
    }
    setAssignments(newAssignments);
  }, [scopeInfo, treasuryShareBps]);

  // ── Helpers ──

  const allDeliverables: { title: string; format: string; hours: number; ws: string; skills?: string[] }[] = [];
  if (scopeInfo?.workPlan?.workstreams) {
    for (const ws of scopeInfo.workPlan.workstreams) {
      for (const del of ws.deliverables || []) {
        allDeliverables.push({
          title: del.title,
          format: del.format,
          hours: del.estimatedEffortHours || 0,
          ws: ws.title,
          skills: del.requiredSkills,
        });
      }
    }
  }

  const totalAssignedBps = assignments.reduce((sum, a) => sum + a.paymentShareBps, 0);
  const totalBps = totalAssignedBps + treasuryShareBps;
  const selectedSquad = squads.find(s => s.id === selectedSquadId);

  function updateAssignment(key: string, field: Partial<Assignment>) {
    setAssignments(prev => prev.map(a =>
      a.deliverableKey === key ? { ...a, ...field } : a
    ));
  }

  function assignTo(key: string, type: 'user' | 'agent', id: string, name: string) {
    updateAssignment(key, {
      userId: type === 'user' ? id : null,
      agentId: type === 'agent' ? id : null,
      assigneeName: name,
    });
  }

  async function handleSave() {
    if (!scopeId || !selectedSquadId) return;
    setSaving(true);
    try {
      const endpoint = bidId ? `/api/bids/${bidId}` : `/api/scopes/${scopeId}/bids`;
      const method = bidId ? 'PATCH' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squadId: selectedSquadId,
          approach,
          proposedPrice,
          treasuryShareBps,
          paymentSchedule: { upfrontPercentage, finalPercentage: 100 - upfrontPercentage },
          proposedTimeline: { notes: timelineNotes },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBidId(data.id);
        // Save assignments
        if (data.id && assignments.length > 0) {
          await fetch(`/api/bids/${data.id}/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignments: assignments.filter(a => a.userId || a.agentId) }),
          });
        }
        toast.success('Draft saved');
      } else {
        toast.error('Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    if (!bidId) await handleSave();
    const currentBidId = bidId;
    if (!currentBidId) return;
    try {
      const res = await fetch(`/api/bids/${currentBidId}/submit-for-review`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.autoRatified) {
          // Solo squad or delegated admin — auto-ratified, go to submit directly
          toast.success('Bid auto-ratified (solo squad). Submitting to client...');
          const submitRes = await fetch(`/api/bids/${currentBidId}/submit`, { method: 'POST' });
          if (submitRes.ok) {
            toast.success('Bid submitted to client!');
          }
        } else {
          toast.success('Bid submitted for squad review!');
        }
        router.push(`/scopes/${scopeId}`);
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to submit');
      }
    } catch {
      toast.error('Failed to submit');
    }
  }

  // ── Render guards ──

  if (!scopeId) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">No scope selected.</p>
        <Link href="/scopes" className="text-accent-agent hover:underline mt-2 inline-block">Browse Scopes</Link>
      </div>
    );
  }
  if (scopeLoading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!scopeInfo) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold mb-2">Scope Not Found</h1>
        <Link href="/scopes" className="text-accent-agent hover:underline">Browse Scopes</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/scopes/${scopeId}`} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Scope
        </Link>
        <h1 className="text-2xl font-bold">Build Your Bid</h1>
        <p className="text-text-secondary mt-1">Bidding on: <span className="font-medium text-text-primary">{scopeInfo.title}</span></p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                step === s.key
                  ? 'bg-accent-squad text-white'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-primary'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center font-bold">
                {s.num}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
          </div>
        ))}
      </div>

      {/* Squad selection (persistent) */}
      {!selectedSquadId && (
        <div className="bg-white rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Select Your Squad</h2>
          {squads.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-text-secondary text-sm mb-3">Create a squad first.</p>
              <Link href="/squads/new" className="px-4 py-2 bg-accent-squad text-white text-sm font-medium rounded-lg hover:opacity-90">Create a Squad</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {squads.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSquadId(s.id)}
                  className="p-4 border border-border rounded-xl text-left hover:border-accent-squad transition-colors"
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-text-secondary mt-1">Role: {s.role}</div>
                  {s.governanceModel && <div className="text-xs text-accent-agent mt-1 capitalize">{s.governanceModel.type} governance</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSquadId && (
        <>
          {/* Step 1: Scope Review */}
          {step === 'scope' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Scope Overview</h2>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div><div className="text-xs text-text-secondary">Budget Range</div><div className="font-medium">${scopeInfo.budgetMin || '?'} - ${scopeInfo.budgetMax || '?'}</div></div>
                  <div><div className="text-xs text-text-secondary">Timeline</div><div className="font-medium">{scopeInfo.timelineDays || '?'} days</div></div>
                  <div><div className="text-xs text-text-secondary">Deliverables</div><div className="font-medium">{allDeliverables.length}</div></div>
                </div>
              </div>
              {scopeInfo.workPlan?.workstreams?.map((ws, i) => (
                <div key={i} className="bg-white rounded-xl border border-border p-6">
                  <h3 className="font-semibold mb-3">{ws.title}</h3>
                  <div className="space-y-2">
                    {ws.deliverables?.map((del, j) => (
                      <div key={j} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
                        <div>
                          <div className="text-sm font-medium">{del.title}</div>
                          <div className="text-xs text-text-secondary">{del.format} {del.estimatedEffortHours ? `• ${del.estimatedEffortHours}h` : ''}</div>
                        </div>
                        {del.requiredSkills && (
                          <div className="flex gap-1">{del.requiredSkills.slice(0, 3).map(s => <span key={s} className="text-[10px] bg-accent-agent/10 text-accent-agent px-1.5 py-0.5 rounded-full">{s}</span>)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <button onClick={() => setStep('team')} className="px-6 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover">
                  Next: Assign Team
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Team Assignment */}
          {step === 'team' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Assign Team Members</h2>
                <p className="text-sm text-text-secondary mb-4">
                  Assign a squad member or AI agent to each deliverable. Squad: <span className="font-medium text-text-primary">{selectedSquad?.name}</span>
                </p>
                <div className="space-y-3">
                  {assignments.map((a, i) => {
                    const del = allDeliverables[i];
                    return (
                      <div key={a.deliverableKey} className="flex items-center gap-4 p-4 bg-bg-primary rounded-xl">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{del?.title || a.deliverableTitle}</div>
                          <div className="text-xs text-text-secondary">{del?.ws} • {del?.format} • {del?.hours || '?'}h</div>
                        </div>
                        <select
                          value={a.userId || a.agentId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) { assignTo(a.deliverableKey, 'user', '', ''); return; }
                            const member = members.find(m => m.userId === val);
                            if (member) { assignTo(a.deliverableKey, 'user', val, member.displayName || member.email || 'Member'); return; }
                            const agent = agents.find(ag => ag.id === val);
                            if (agent) { assignTo(a.deliverableKey, 'agent', val, agent.name); }
                          }}
                          className="w-48 px-3 py-2 border border-border rounded-lg bg-white text-sm focus:ring-2 focus:ring-accent-agent/40 focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          <optgroup label="Members">
                            {members.map(m => <option key={m.userId} value={m.userId}>{m.displayName || m.email || 'Member'}</option>)}
                          </optgroup>
                          {agents.length > 0 && (
                            <optgroup label="AI Agents">
                              {agents.map(ag => <option key={ag.id} value={ag.id}>{ag.name} ({ag.provider})</option>)}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep('scope')} className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-bg-secondary">Back</button>
                <button onClick={() => setStep('payment')} className="px-6 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover">
                  Next: Payment Split
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment Split */}
          {step === 'payment' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Payment Split</h2>
                <p className="text-sm text-text-secondary mb-6">
                  Set the payment share for each assigned member. Total must equal 100%.
                </p>

                {/* Treasury */}
                <div className="flex items-center justify-between p-4 bg-accent-client/5 border border-accent-client/20 rounded-xl mb-4">
                  <div>
                    <div className="text-sm font-medium">Squad Treasury</div>
                    <div className="text-xs text-text-secondary">Goes to the squad&apos;s multisig</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={0} max={5000} step={100}
                      value={treasuryShareBps}
                      onChange={e => setTreasuryShareBps(Number(e.target.value))}
                      className="w-32 accent-accent-client"
                    />
                    <span className="text-sm font-mono w-12 text-right">{(treasuryShareBps / 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Per-assignment splits */}
                <div className="space-y-2">
                  {assignments.filter(a => a.userId || a.agentId).map(a => (
                    <div key={a.deliverableKey} className="flex items-center justify-between p-3 bg-bg-primary rounded-xl">
                      <div>
                        <div className="text-sm font-medium">{a.assigneeName}</div>
                        <div className="text-xs text-text-secondary">{a.deliverableTitle}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range" min={0} max={5000} step={100}
                          value={a.paymentShareBps}
                          onChange={e => updateAssignment(a.deliverableKey, { paymentShareBps: Number(e.target.value) })}
                          className="w-32 accent-accent-squad"
                        />
                        <span className="text-sm font-mono w-12 text-right">{(a.paymentShareBps / 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total indicator */}
                <div className={`mt-4 p-3 rounded-xl text-sm font-medium text-center ${
                  totalBps === 10000 ? 'bg-success/10 text-success' :
                  totalBps > 10000 ? 'bg-error/10 text-error' :
                  'bg-warning/10 text-warning'
                }`}>
                  Total: {(totalBps / 100).toFixed(0)}% {totalBps === 10000 ? '— Perfect' : totalBps > 10000 ? '— Over 100%!' : `— ${((10000 - totalBps) / 100).toFixed(0)}% unallocated`}
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep('team')} className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-bg-secondary">Back</button>
                <button onClick={() => setStep('approach')} className="px-6 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover">
                  Next: Approach
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Approach & Terms */}
          {step === 'approach' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Your Approach</h2>
                <textarea
                  value={approach} onChange={e => setApproach(e.target.value)} rows={8}
                  placeholder="Describe how your squad would tackle this scope..."
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm resize-y"
                />
              </div>
              <div className="bg-white rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Pricing & Terms</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Total bid (USDC)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-text-secondary text-sm">$</span>
                      <input type="number" value={proposedPrice} onChange={e => setProposedPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3.5 py-2.5 border border-border rounded-xl bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Upfront: {upfrontPercentage}%</label>
                    <input type="range" min={0} max={50} value={upfrontPercentage} onChange={e => setUpfrontPercentage(Number(e.target.value))}
                      className="w-full mt-2 accent-accent-squad" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Timeline</h2>
                <textarea value={timelineNotes} onChange={e => setTimelineNotes(e.target.value)} rows={3}
                  placeholder="Proposed timeline and milestones..."
                  className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm resize-y" />
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep('payment')} className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-bg-secondary">Back</button>
                <button onClick={() => { handleSave(); setStep('review'); }} className="px-6 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover">
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit for Vote */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Bid Summary</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-3 bg-bg-primary rounded-xl">
                    <div className="text-xs text-text-secondary">Squad</div>
                    <div className="font-medium">{selectedSquad?.name}</div>
                  </div>
                  <div className="p-3 bg-bg-primary rounded-xl">
                    <div className="text-xs text-text-secondary">Price</div>
                    <div className="font-medium">${proposedPrice || '0'} USDC</div>
                  </div>
                  <div className="p-3 bg-bg-primary rounded-xl">
                    <div className="text-xs text-text-secondary">Upfront</div>
                    <div className="font-medium">{upfrontPercentage}%</div>
                  </div>
                </div>

                <h3 className="text-sm font-semibold mb-3">Team Assignments</h3>
                <div className="space-y-2 mb-6">
                  {assignments.filter(a => a.userId || a.agentId).map(a => (
                    <div key={a.deliverableKey} className="flex items-center justify-between p-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{a.deliverableTitle}</span>
                        <span className="text-xs text-text-muted">→</span>
                        <span className="text-sm font-medium">{a.assigneeName}</span>
                        {a.agentId && <span className="text-[10px] bg-accent-agent/10 text-accent-agent px-1 py-0.5 rounded-full">AI</span>}
                      </div>
                      <span className="text-sm font-mono">{(a.paymentShareBps / 100).toFixed(0)}%</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-2 text-accent-client">
                    <span className="text-sm font-medium">Squad Treasury</span>
                    <span className="text-sm font-mono">{(treasuryShareBps / 100).toFixed(0)}%</span>
                  </div>
                </div>

                {selectedSquad?.governanceModel && (
                  <div className="p-3 bg-accent-agent/5 rounded-xl text-sm">
                    <span className="font-medium">Governance: </span>
                    <span className="capitalize">{selectedSquad.governanceModel.type}</span>
                    {' — '}
                    {selectedSquad.governanceModel.type === 'consent'
                      ? 'All members must not object within 72h'
                      : selectedSquad.governanceModel.type === 'majority'
                      ? 'Majority of members must approve'
                      : 'Squad lead can approve unilaterally'}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep('approach')} className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-bg-secondary">Back</button>
                <div className="flex gap-3">
                  <button onClick={handleSave} disabled={saving}
                    className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-bg-secondary disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handleSubmitForReview}
                    disabled={!approach || !proposedPrice || totalBps !== 10000 || saving}
                    className="px-6 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover disabled:opacity-50"
                  >
                    {members.length <= 1 ? 'Submit Bid' : 'Submit for Squad Vote'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function NewBidPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin" /></div>}>
      <BidBuilderContent />
    </Suspense>
  );
}
