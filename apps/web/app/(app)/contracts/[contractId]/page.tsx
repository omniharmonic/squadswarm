'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useWeb3 } from '@/components/web3-provider';
import { type Address, type Hex } from 'viem';
import { SQUAD_SWARM_ESCROW_ABI, generateContractId, toUSDC } from '@squadswarm/web3';

/* ── Rating types & helpers ─────────────────────────────────── */
interface Rating {
  overall: number;
  quality: number;
  communication: number;
  timeliness: number;
  wouldRehire: boolean;
  feedback: string | null;
  createdAt: string;
}

function StarSelector({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`text-lg transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => onChange?.(star)}
        >
          <svg
            className={`w-5 h-5 ${(hover || value) >= star ? 'text-amber-400' : 'text-gray-200'}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <StarSelector value={value} readonly />
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending_deposit: 'bg-accent-client/10 text-accent-client',
  active: 'bg-success/10 text-success',
  completed: 'bg-accent-agent/10 text-accent-agent',
  paused: 'bg-warning/10 text-warning',
  cancelled: 'bg-error/10 text-error',
  disputed: 'bg-warning/10 text-warning',
  draft: 'bg-bg-secondary text-text-secondary',
};

const DELIVERABLE_STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  not_started: { bg: 'bg-bg-secondary', label: 'Not Started' },
  in_progress: { bg: 'bg-accent-client/10 text-accent-client', label: 'In Progress' },
  in_review: { bg: 'bg-escrow/10 text-escrow', label: 'In Review' },
  revision_requested: { bg: 'bg-warning/10 text-warning', label: 'Revision Requested' },
  approved: { bg: 'bg-success/10 text-success', label: 'Approved' },
  blocked: { bg: 'bg-error/10 text-error', label: 'Blocked' },
};

interface Deliverable {
  id: string;
  title: string;
  status: string;
  format: string;
  assignee: string;
}

interface Workstream {
  id: string;
  title: string;
  status: string;
  deliverables: Deliverable[];
}

interface CollaborationLink {
  type: string;
  label: string;
  url: string;
  addedBy?: string;
}

interface Contract {
  id: string;
  title: string;
  status: string;
  clientName: string;
  squadName: string;
  squadId: string;
  totalAmount: string;
  feedbackRoundsTotal: number;
  feedbackRoundsUsed: number;
  startedAt: string;
  completedAt: string | null;
  smartContractAddress: string | null;
  collaborationLinks: Array<{ type: string; label: string; url: string }>;
  workstreams: Workstream[];
}

// All payments are USDC on Base — no fiat mode

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

const LINK_ICONS: Record<string, string> = {
  notion: '\u{1F4DD}',
  github: '\u{1F4BB}',
  google_drive: '\u{1F4C1}',
  figma: '\u{1F3A8}',
  discord: '\u{1F4AC}',
  slack: '\u{1F4AC}',
  linear: '\u{1F4CB}',
  custom: '\u{1F517}',
};

const LINK_TYPE_OPTIONS = [
  { value: 'notion', label: 'Notion' },
  { value: 'github', label: 'GitHub' },
  { value: 'google_drive', label: 'Google Drive' },
  { value: 'figma', label: 'Figma' },
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'linear', label: 'Linear' },
  { value: 'custom', label: 'Custom' },
];

interface Dispute {
  id: string;
  reason: string;
  status: string;
  resolution: { text: string; clientPercentage: number; squadPercentage: number } | null;
  createdAt: string;
}

export default function ContractOverviewPage() {
  const params = useParams();
  const contractId = params.contractId as string;
  const { connect, isConnected, connecting, walletClient, address } = useWeb3();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [fundingError, setFundingError] = useState('');

  // Completion state
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [raisingDispute, setRaisingDispute] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [resolutionText, setResolutionText] = useState('');
  const [clientPct, setClientPct] = useState(50);
  const [squadPct, setSquadPct] = useState(50);
  const [resolving, setResolving] = useState(false);

  // Collaboration links state
  const [collabLinks, setCollabLinks] = useState<CollaborationLink[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkType, setNewLinkType] = useState('notion');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);

  // Rating state
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [ratingOverall, setRatingOverall] = useState(0);
  const [ratingQuality, setRatingQuality] = useState(0);
  const [ratingComm, setRatingComm] = useState(0);
  const [ratingTimeliness, setRatingTimeliness] = useState(0);
  const [wouldRehire, setWouldRehire] = useState(true);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const fetchRating = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/rate`);
      if (res.ok) {
        const data = await res.json();
        if (data.rating) setExistingRating(data.rating);
      }
    } catch {
      // ignore
    }
  }, [contractId]);

  const fetchCollabLinks = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/links`);
      if (res.ok) {
        const data = await res.json();
        setCollabLinks(data.links || []);
      }
    } catch {
      // ignore
    }
  }, [contractId]);

  async function handleAddLink() {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    setAddingLink(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/links`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          link: { type: newLinkType, label: newLinkLabel.trim(), url: newLinkUrl.trim() },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCollabLinks(data.links || []);
        setNewLinkLabel('');
        setNewLinkUrl('');
        setNewLinkType('notion');
        setShowAddLink(false);
      }
    } catch {
      // silently fail
    } finally {
      setAddingLink(false);
    }
  }

  async function handleRemoveLink(url: string) {
    try {
      const res = await fetch(`/api/contracts/${contractId}/links`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', link: { url } }),
      });
      if (res.ok) {
        const data = await res.json();
        setCollabLinks(data.links || []);
      }
    } catch {
      // silently fail
    }
  }

  async function handleSubmitRating() {
    if (ratingOverall === 0 || ratingQuality === 0 || ratingComm === 0 || ratingTimeliness === 0) {
      setRatingError('Please provide all star ratings.');
      return;
    }
    setSubmittingRating(true);
    setRatingError('');
    try {
      const res = await fetch(`/api/contracts/${contractId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall: ratingOverall,
          quality: ratingQuality,
          communication: ratingComm,
          timeliness: ratingTimeliness,
          wouldRehire,
          feedback: ratingFeedback || undefined,
        }),
      });
      if (res.ok) {
        await fetchRating();
      } else {
        const err = await res.json();
        setRatingError(err.error || 'Failed to submit rating');
      }
    } catch {
      setRatingError('Network error');
    } finally {
      setSubmittingRating(false);
    }
  }

  async function fetchContract() {
    try {
      const res = await fetch(`/api/contracts/${contractId}`);
      if (res.ok) {
        const data = await res.json();
        setContract({
          id: data.id,
          title: data.title,
          status: data.status,
          clientName: data.clientName || 'Unknown',
          squadName: data.squadName || 'Unknown',
          squadId: data.squadId || '',
          totalAmount: data.totalAmount || '0',
          feedbackRoundsTotal: data.feedbackRoundsTotal ?? 3,
          feedbackRoundsUsed: data.feedbackRoundsUsed ?? 0,
          startedAt: data.startedAt || data.createdAt || '',
          completedAt: data.completedAt || null,
          smartContractAddress: data.smartContractAddress || null,
          collaborationLinks: data.collaborationLinks || [],
          workstreams: (data.workstreams || []).map((ws: Record<string, unknown>) => ({
            id: ws.id as string,
            title: ws.title as string,
            status: (ws.status as string) || 'not_started',
            deliverables: ((ws.deliverables as Record<string, unknown>[]) || []).map((d: Record<string, unknown>) => ({
              id: d.id as string,
              title: d.title as string,
              status: (d.status as string) || 'not_started',
              format: (d.format as string) || 'document',
              assignee: (d.assignee as string) || 'Unassigned',
            })),
          })),
        } as Contract);

        // All payments are USDC on Base — no squad payment mode check needed
      }
    } catch {
      // Leave contract as null on failure
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContract();
    fetchRating();
    fetchCollabLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, fetchRating, fetchCollabLinks]);

  async function handleFundContract() {
    if (!walletClient || !address) {
      try {
        const addr = await connect();
        if (!addr) return;
      } catch {
        return;
      }
    }

    setFunding(true);
    setFundingError('');
    try {
      const escrowAddr = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as Address | undefined;
      const usdcAddr = process.env.NEXT_PUBLIC_USDC_ADDRESS as Address | undefined;

      if (!escrowAddr || !usdcAddr) {
        // Contracts not deployed yet — use stub flow
        const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        const res = await fetch(`/api/contracts/${contractId}/deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash: mockTxHash }),
        });
        if (res.ok) {
          await fetchContract();
        } else {
          const err = await res.json();
          setFundingError(err.error || 'Failed to record deposit');
        }
        return;
      }

      // REAL ON-CHAIN FLOW
      const depositAmount = toUSDC(parseFloat(contract!.totalAmount));

      // Step 1: Approve USDC spend
      setFundingError('Step 1/2: Approving USDC spend...');
      const ERC20_APPROVE_ABI = [{
        type: 'function' as const,
        name: 'approve',
        inputs: [
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
        stateMutability: 'nonpayable' as const,
      }] as const;

      const approveTx = await walletClient!.writeContract({
        account: address!,
        chain: walletClient!.chain!,
        address: usdcAddr,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [escrowAddr, depositAmount],
      });

      // Step 2: Deposit to escrow
      setFundingError('Step 2/2: Depositing to escrow...');
      const contractIdHex = generateContractId(contractId, 0) as Hex;

      const depositTx = await walletClient!.writeContract({
        account: address!,
        chain: walletClient!.chain!,
        address: escrowAddr,
        abi: SQUAD_SWARM_ESCROW_ABI,
        functionName: 'deposit',
        args: [contractIdHex],
      });

      // Step 3: Record on server with real txHash
      const res = await fetch(`/api/contracts/${contractId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: depositTx }),
      });

      if (res.ok) {
        await fetchContract();
      } else {
        const err = await res.json();
        setFundingError(err.error || 'Failed to record deposit');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deposit failed';
      setFundingError(msg);
    } finally {
      setFunding(false);
    }
  }

  async function handleCompleteContract() {
    setCompleting(true);
    setCompleteError('');
    try {
      const escrowAddr = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as Address | undefined;

      if (escrowAddr && walletClient && address) {
        // REAL ON-CHAIN FLOW: call complete() on escrow first
        setCompleteError('Completing contract on-chain...');
        const contractIdHex = generateContractId(contractId, 0) as Hex;

        await walletClient.writeContract({
          account: address,
          chain: walletClient.chain!,
          address: escrowAddr,
          abi: SQUAD_SWARM_ESCROW_ABI,
          functionName: 'complete',
          args: [contractIdHex],
        });
        setCompleteError('');
      }

      // Record completion on the server (works for both stub and real flows)
      const res = await fetch(`/api/contracts/${contractId}/complete`, { method: 'POST' });
      if (res.ok) {
        setShowCompleteConfirm(false);
        await fetchContract();
      } else {
        const err = await res.json();
        setCompleteError(err.error || 'Failed to complete contract');
      }
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setCompleting(false);
    }
  }

  async function fetchDisputes() {
    try {
      const res = await fetch(`/api/contracts/${contractId}/disputes`);
      if (res.ok) {
        const data = await res.json();
        setDisputes(data);
      }
    } catch {
      // Silently fail for demo
    }
  }

  async function handleRaiseDispute() {
    if (!disputeReason.trim()) return;
    setRaisingDispute(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      if (res.ok) {
        setDisputeReason('');
        setShowDisputeForm(false);
        await fetchContract();
        await fetchDisputes();
      }
    } catch {
      // Silently fail for demo
    } finally {
      setRaisingDispute(false);
    }
  }

  async function handleResolveDispute(disputeId: string) {
    if (!resolutionText.trim()) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: resolutionText.trim(),
          clientPercentage: clientPct,
          squadPercentage: squadPct,
        }),
      });
      if (res.ok) {
        setResolutionText('');
        await fetchContract();
        await fetchDisputes();
      }
    } catch {
      // Silently fail for demo
    } finally {
      setResolving(false);
    }
  }

  useEffect(() => {
    if (contract?.status === 'disputed') {
      fetchDisputes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.status]);

  if (!contract) {
    return (
      <div className="max-w-5xl">
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Unable to load contract data</h3>
          <p className="text-text-secondary text-sm">No data yet. Please check your connection or try again later.</p>
        </div>
      </div>
    );
  }

  const allDeliverables = contract.workstreams.flatMap((ws) => ws.deliverables);
  const approvedCount = allDeliverables.filter((d) => d.status === 'approved').length;
  const totalCount = allDeliverables.length;
  const progressPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  const allApproved = totalCount > 0 && approvedCount === totalCount;
  const totalAmount = parseFloat(contract.totalAmount);
  const upfrontAmount = totalAmount * 0.25;
  const escrowedAmount = totalAmount * 0.75;
  const releasedSoFar = totalCount > 0 ? escrowedAmount * (approvedCount / totalCount) : 0;
  const paymentProgressPercent = totalAmount > 0 ? Math.round(((upfrontAmount + releasedSoFar) / totalAmount) * 100) : 0;
  const escrowAddress = contract.smartContractAddress;

  const daysActive = contract.startedAt
    ? Math.floor((Date.now() - new Date(contract.startedAt).getTime()) / 86400000)
    : 0;

  const tabs = [
    { label: 'Board', href: `/contracts/${contractId}/board` },
    { label: 'Timeline', href: `/contracts/${contractId}/timeline` },
    { label: 'Files', href: `/contracts/${contractId}/files` },
    { label: 'Discussion', href: `/contracts/${contractId}/discussion` },
    { label: 'PM Dashboard', href: `/contracts/${contractId}/pm` },
    { label: 'Context', href: `/contracts/${contractId}/context` },
    { label: 'Client Review', href: `/contracts/${contractId}/review` },
  ];

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="bg-white rounded-xl border border-border p-6 mb-6 animate-pulse">
          <div className="h-8 bg-bg-secondary rounded w-1/3 mb-4" />
          <div className="h-4 bg-bg-secondary rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-text-primary">{contract.title}</h1>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[contract.status] || STATUS_STYLES.draft}`}
              >
                {contract.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span>
                Client: <span className="font-medium text-accent-client">{contract.clientName}</span>
              </span>
              <span className="text-border">|</span>
              <span>
                Squad: <span className="font-medium text-accent-squad">{contract.squadName}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-text-secondary">
              Deliverable Progress
            </span>
            <span className="font-medium text-text-primary">
              {approvedCount} of {totalCount} approved ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Total Amount</p>
          <p className="text-xl font-bold text-text-primary mt-1">
            ${parseFloat(contract.totalAmount).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Days Active</p>
          <p className="text-xl font-bold text-text-primary mt-1">{daysActive}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Feedback Rounds</p>
          <p className="text-xl font-bold text-text-primary mt-1">
            {contract.feedbackRoundsUsed}{' '}
            <span className="text-sm font-normal text-text-secondary">
              of {contract.feedbackRoundsTotal}
            </span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Deliverables</p>
          <p className="text-xl font-bold text-text-primary mt-1">
            {approvedCount}{' '}
            <span className="text-sm font-normal text-text-secondary">
              of {totalCount} done
            </span>
          </p>
        </div>
      </div>

      {/* Payment status — enhanced */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Payment Status</h2>

        {contract.status === 'pending_deposit' && (
          <div>
            <div className="bg-accent-agent/5 rounded-lg p-4 border border-accent-agent/20">
              <p className="text-sm font-medium text-accent-agent mb-2">Fund with USDC on Base</p>
              <p className="text-sm text-text-secondary mb-2">
                Deposit {formatCurrency(totalAmount)} USDC to start work on this contract.
              </p>
              {escrowAddress && (
                <div className="flex items-center gap-2 mb-3">
                  <code className="text-xs font-mono bg-white px-3 py-2 rounded border border-border text-text-primary flex-1 truncate">
                    {escrowAddress}
                  </code>
                  <a
                    href={`https://basescan.org/address/${escrowAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-agent hover:underline whitespace-nowrap"
                  >
                    View on Basescan
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleFundContract}
                  disabled={funding || connecting}
                  className="px-5 py-2.5 bg-accent-agent text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {connecting
                    ? 'Connecting Wallet...'
                    : funding
                      ? 'Confirming Deposit...'
                      : isConnected
                        ? `Fund ${formatCurrency(totalAmount)} USDC`
                        : 'Connect Wallet to Fund'}
                </button>
                {isConnected && (
                  <span className="text-xs text-success flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Wallet connected
                  </span>
                )}
              </div>
              {fundingError && (
                <p className="text-xs text-error mt-2">{fundingError}</p>
              )}
              <p className="text-xs text-text-secondary mt-3">
                All payments are processed as USDC on Base via the SquadSwarm escrow contract.
              </p>
            </div>
          </div>
        )}

        {contract.status === 'active' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Funded
              </span>
              <span className="text-text-primary font-medium">
                {formatCurrency(totalAmount)} deposited
              </span>
            </div>

            {/* Payment breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-bg-primary rounded-lg p-3">
                <p className="text-xs text-text-secondary">Total</p>
                <p className="text-sm font-bold text-text-primary">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="bg-bg-primary rounded-lg p-3">
                <p className="text-xs text-text-secondary">Upfront (25%)</p>
                <p className="text-sm font-bold text-success">{formatCurrency(upfrontAmount)}</p>
              </div>
              <div className="bg-bg-primary rounded-lg p-3">
                <p className="text-xs text-text-secondary">Escrowed (75%)</p>
                <p className="text-sm font-bold text-escrow">{formatCurrency(escrowedAmount)}</p>
              </div>
              <div className="bg-bg-primary rounded-lg p-3">
                <p className="text-xs text-text-secondary">Released</p>
                <p className="text-sm font-bold text-accent-agent">{formatCurrency(releasedSoFar)}</p>
              </div>
            </div>

            {/* Payment release progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-secondary">Payment Release Progress</span>
                <span className="font-medium text-text-primary">{paymentProgressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-agent rounded-full transition-all"
                  style={{ width: `${paymentProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <svg className="w-4 h-4 text-accent-agent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span>USDC escrowed on Base</span>
              {escrowAddress && (
                <a
                  href={`https://basescan.org/address/${escrowAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-agent hover:underline"
                >
                  {escrowAddress.slice(0, 6)}...{escrowAddress.slice(-4)}
                </a>
              )}
            </div>
          </div>
        )}

        {contract.status === 'completed' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-agent/10 text-accent-agent rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                All Funds Released
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <div className="bg-bg-primary rounded-lg p-3">
                <p className="text-xs text-text-secondary">Total Paid</p>
                <p className="text-sm font-bold text-success">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="bg-bg-primary rounded-lg p-3">
                <p className="text-xs text-text-secondary">Payment Method</p>
                <p className="text-sm font-bold text-text-primary">USDC on Base</p>
              </div>
              <div className="bg-bg-primary rounded-lg p-3">
                <p className="text-xs text-text-secondary">Completed</p>
                <p className="text-sm font-bold text-text-primary">
                  {contract.completedAt
                    ? new Date(contract.completedAt).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full w-full" />
            </div>
          </div>
        )}

        {contract.status === 'disputed' && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 text-warning rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9.66 16.59A1 1 0 0120.66 21H3.34a1 1 0 01-.86-1.41L12 3z" /></svg>
              Disputed
            </span>
            <span className="text-text-primary font-medium">
              {formatCurrency(totalAmount)} held in escrow
            </span>
          </div>
        )}
      </div>

      {/* Complete Contract — shown when all deliverables approved and contract is active */}
      {contract.status === 'active' && allApproved && totalCount > 0 && (
        <div className="bg-success/5 rounded-xl border-2 border-success/30 p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-success uppercase tracking-wide mb-1">Ready to Complete</h2>
              <p className="text-text-primary font-medium">
                All {totalCount} deliverables approved. Releasing {formatCurrency(totalAmount)} to {contract.squadName}.
              </p>
              <p className="text-xs text-text-secondary mt-1">
                The on-chain USDC release will be triggered after confirmation.
              </p>
            </div>
            {!showCompleteConfirm ? (
              <button
                onClick={() => setShowCompleteConfirm(true)}
                className="px-5 py-2.5 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
              >
                Complete Contract
              </button>
            ) : (
              <div className="shrink-0 text-right space-y-2">
                <p className="text-sm text-text-secondary">Are you sure? This will release all escrowed funds.</p>
                {completeError && <p className="text-sm text-error">{completeError}</p>}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowCompleteConfirm(false); setCompleteError(''); }}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteContract}
                    disabled={completing}
                    className="px-5 py-2.5 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {completing ? 'Completing...' : 'Confirm Completion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collaboration Spaces */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Collaboration Spaces
          </h2>
          <button
            onClick={() => setShowAddLink(!showAddLink)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent-squad/10 text-accent-squad hover:bg-accent-squad/20 transition-colors"
          >
            {showAddLink ? 'Cancel' : '+ Add Link'}
          </button>
        </div>

        {collabLinks.length === 0 && !showAddLink && (
          <p className="text-sm text-text-secondary">
            No collaboration spaces linked yet. Add tools your team uses.
          </p>
        )}

        {collabLinks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {collabLinks.map((link, i) => (
              <div
                key={`${link.url}-${i}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-bg-primary group"
              >
                <span className="text-lg shrink-0">{LINK_ICONS[link.type] || LINK_ICONS.custom}</span>
                <div className="flex-1 min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-text-primary hover:text-accent-squad transition-colors truncate block"
                  >
                    {link.label}
                  </a>
                  <span className="text-[10px] text-text-secondary capitalize">{link.type.replace('_', ' ')}</span>
                </div>
                <button
                  onClick={() => handleRemoveLink(link.url)}
                  className="text-text-secondary hover:text-error transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  title="Remove link"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddLink && (
          <div className="mt-3 space-y-3 p-4 rounded-lg bg-bg-primary border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Type</label>
                <select
                  value={newLinkType}
                  onChange={(e) => setNewLinkType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-squad/30"
                >
                  {LINK_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {LINK_ICONS[opt.value]} {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Label</label>
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder="e.g. Project Docs"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-squad/30"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">URL</label>
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-squad/30"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddLink}
                disabled={addingLink || !newLinkLabel.trim() || !newLinkUrl.trim()}
                className="px-4 py-2 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {addingLink ? 'Adding...' : 'Add Link'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dispute section */}
      {contract.status === 'active' && (
        <div className="bg-white rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Dispute</h2>
              <p className="text-sm text-text-secondary mt-0.5">If there is an issue, raise a dispute to pause work and begin resolution.</p>
            </div>
            {!showDisputeForm && (
              <button
                onClick={() => setShowDisputeForm(true)}
                className="px-4 py-2 border border-warning text-warning rounded-lg text-sm font-medium hover:bg-warning/5 transition-colors"
              >
                Raise Dispute
              </button>
            )}
          </div>
          {showDisputeForm && (
            <div className="mt-4 space-y-3">
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={3}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-warning/40"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowDisputeForm(false); setDisputeReason(''); }}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRaiseDispute}
                  disabled={raisingDispute || !disputeReason.trim()}
                  className="px-4 py-2 bg-warning text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {raisingDispute ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {contract.status === 'disputed' && (
        <div className="bg-white rounded-xl border border-warning/30 p-5 mb-6">
          <h2 className="text-sm font-semibold text-warning uppercase tracking-wide mb-4">Active Disputes</h2>
          {disputes.length === 0 && (
            <p className="text-sm text-text-secondary">Loading disputes...</p>
          )}
          {disputes.map((d) => (
            <div key={d.id} className="border border-border rounded-lg p-4 mb-3 last:mb-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.status === 'resolved' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {d.status}
                  </span>
                  <span className="text-xs text-text-secondary ml-2">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="text-sm text-text-primary mb-3">{d.reason}</p>

              {d.status === 'resolved' && d.resolution && (
                <div className="bg-success/5 rounded-lg p-3 text-sm">
                  <p className="font-medium text-success mb-1">Resolution</p>
                  <p className="text-text-primary">{d.resolution.text}</p>
                  <div className="flex gap-4 mt-2 text-xs text-text-secondary">
                    <span>Client: {d.resolution.clientPercentage}%</span>
                    <span>Squad: {d.resolution.squadPercentage}%</span>
                  </div>
                </div>
              )}

              {d.status === 'raised' && (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Resolve Dispute</p>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe the resolution..."
                    rows={2}
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-warning/40"
                  />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-secondary">Client %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={clientPct}
                        onChange={(e) => { const v = Number(e.target.value); setClientPct(v); setSquadPct(100 - v); }}
                        className="w-16 rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-warning/40"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-secondary">Squad %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={squadPct}
                        onChange={(e) => { const v = Number(e.target.value); setSquadPct(v); setClientPct(100 - v); }}
                        className="w-16 rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-warning/40"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleResolveDispute(d.id)}
                      disabled={resolving || !resolutionText.trim()}
                      className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {resolving ? 'Resolving...' : 'Resolve Dispute'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Client Satisfaction Rating — only for completed contracts */}
      {contract.status === 'completed' && (
        <div className="bg-white rounded-xl border border-border p-5 mb-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
            Client Satisfaction Rating
          </h2>

          {existingRating ? (
            <div className="space-y-3">
              <StarDisplay value={existingRating.overall} label="Overall" />
              <StarDisplay value={existingRating.quality} label="Quality" />
              <StarDisplay value={existingRating.communication} label="Communication" />
              <StarDisplay value={existingRating.timeliness} label="Timeliness" />
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-text-secondary">Would rehire?</span>
                <span className={`text-sm font-medium ${existingRating.wouldRehire ? 'text-success' : 'text-error'}`}>
                  {existingRating.wouldRehire ? 'Yes' : 'No'}
                </span>
              </div>
              {existingRating.feedback && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-text-secondary mb-1">Feedback</p>
                  <p className="text-sm text-text-primary">{existingRating.feedback}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Overall</span>
                <StarSelector value={ratingOverall} onChange={setRatingOverall} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Quality</span>
                <StarSelector value={ratingQuality} onChange={setRatingQuality} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Communication</span>
                <StarSelector value={ratingComm} onChange={setRatingComm} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Timeliness</span>
                <StarSelector value={ratingTimeliness} onChange={setRatingTimeliness} />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-text-secondary">Would rehire?</span>
                <button
                  type="button"
                  onClick={() => setWouldRehire(!wouldRehire)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    wouldRehire ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                  }`}
                >
                  {wouldRehire ? 'Yes' : 'No'}
                </button>
              </div>
              <textarea
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="Optional feedback for the squad..."
                rows={3}
                className="w-full border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-squad/30"
              />
              {ratingError && (
                <p className="text-sm text-error">{ratingError}</p>
              )}
              <button
                onClick={handleSubmitRating}
                disabled={submittingRating}
                className="px-5 py-2.5 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation tabs */}
      <div className="border-b border-border mb-6 overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary border-b-2 border-transparent hover:border-accent-squad/40 transition-colors whitespace-nowrap"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Workstream summary cards */}
      <div className="space-y-4">
        {contract.workstreams.map((ws) => {
          const statusCounts: Record<string, number> = {};
          ws.deliverables.forEach((d) => {
            statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
          });
          const wsApproved = statusCounts['approved'] || 0;
          const wsTotal = ws.deliverables.length;

          return (
            <div key={ws.id} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-text-primary">{ws.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full capitalize ${DELIVERABLE_STATUS_STYLES[ws.status]?.bg || 'bg-bg-secondary'}`}
                  >
                    {ws.status.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-sm text-text-secondary">
                  {wsApproved}/{wsTotal} complete
                </span>
              </div>

              <div className="space-y-2">
                {ws.deliverables.map((d) => {
                  const isAgent = d.assignee.includes('(Agent)');
                  const statusInfo = DELIVERABLE_STATUS_STYLES[d.status] ?? { bg: 'bg-bg-secondary', label: d.status };

                  return (
                    <div
                      key={d.id}
                      className={`flex items-center gap-3 p-3 rounded-lg bg-bg-primary ${isAgent ? 'border-l-4 border-accent-agent' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-text-primary truncate block">
                          {d.title}
                        </span>
                        <span className="text-xs text-text-secondary">{d.assignee}</span>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${d.format === 'codebase' ? 'bg-accent-agent/10 text-accent-agent' : d.format === 'design' ? 'bg-accent-client/10 text-accent-client' : 'bg-bg-secondary text-text-secondary'}`}>
                        {d.format}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.bg}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
