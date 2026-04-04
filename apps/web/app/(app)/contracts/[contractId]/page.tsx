'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const MOCK_CONTRACT = {
  id: 'mock-contract-1',
  title: 'Regenerative Finance Dashboard',
  status: 'active',
  clientName: 'Climate DAO',
  squadName: 'Regen Builders',
  totalAmount: '12000.00',
  feedbackRoundsTotal: 3,
  feedbackRoundsUsed: 0,
  startedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  workstreams: [
    {
      id: 'ws-1',
      title: 'Data Pipeline',
      status: 'in_progress',
      deliverables: [
        { id: 'd-1', title: 'Subgraph Integration', status: 'approved', format: 'codebase', assignee: 'Kai Torres' },
        { id: 'd-2', title: 'Data Normalization Layer', status: 'in_progress', format: 'codebase', assignee: 'CodeSwarm (Agent)' },
        { id: 'd-3', title: 'API Documentation', status: 'not_started', format: 'document', assignee: 'ResearchBot (Agent)' },
      ],
    },
    {
      id: 'ws-2',
      title: 'Frontend Dashboard',
      status: 'not_started',
      deliverables: [
        { id: 'd-4', title: 'Dashboard UI Components', status: 'in_review', format: 'codebase', assignee: 'Amara Osei' },
        { id: 'd-5', title: 'Chart Visualizations', status: 'in_progress', format: 'codebase', assignee: 'Benjamin Life' },
        { id: 'd-6', title: 'Mobile Responsive Layout', status: 'not_started', format: 'design', assignee: 'Amara Osei' },
      ],
    },
    {
      id: 'ws-3',
      title: 'Reporting & Export',
      status: 'not_started',
      deliverables: [
        { id: 'd-7', title: 'PDF Report Generator', status: 'not_started', format: 'codebase', assignee: 'CodeSwarm (Agent)' },
        { id: 'd-8', title: 'Quarterly Report Template', status: 'blocked', format: 'document', assignee: 'ResearchBot (Agent)' },
      ],
    },
  ],
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success/10 text-success',
  completed: 'bg-accent-agent/10 text-accent-agent',
  paused: 'bg-warning/10 text-warning',
  cancelled: 'bg-error/10 text-error',
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

interface Contract {
  id: string;
  title: string;
  status: string;
  clientName: string;
  squadName: string;
  totalAmount: string;
  feedbackRoundsTotal: number;
  feedbackRoundsUsed: number;
  startedAt: string;
  workstreams: Workstream[];
}

export default function ContractOverviewPage() {
  const params = useParams();
  const contractId = params.contractId as string;
  const [contract, setContract] = useState<Contract>(MOCK_CONTRACT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContract() {
      try {
        const res = await fetch(`/api/contracts/${contractId}`);
        if (res.ok) {
          const data = await res.json();
          setContract({
            id: data.id,
            title: data.title,
            status: data.status,
            clientName: data.clientName,
            squadName: data.squadName,
            totalAmount: data.totalAmount,
            feedbackRoundsTotal: data.feedbackRoundsTotal ?? 3,
            feedbackRoundsUsed: data.feedbackRoundsUsed ?? 0,
            startedAt: data.startedAt || data.createdAt,
            workstreams: (data.workstreams || []).map((ws: Record<string, unknown>) => ({
              id: ws.id,
              title: ws.title,
              status: ws.status || 'not_started',
              deliverables: ((ws.deliverables as Record<string, unknown>[]) || []).map((d: Record<string, unknown>) => ({
                id: d.id,
                title: d.title,
                status: d.status || 'not_started',
                format: d.format || 'document',
                assignee: d.assignee || 'Unassigned',
              })),
            })),
          });
        }
      } catch {
        // Keep mock data as fallback
      } finally {
        setLoading(false);
      }
    }
    fetchContract();
  }, [contractId]);

  const allDeliverables = contract.workstreams.flatMap((ws) => ws.deliverables);
  const approvedCount = allDeliverables.filter((d) => d.status === 'approved').length;
  const totalCount = allDeliverables.length;
  const progressPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  const daysActive = contract.startedAt
    ? Math.floor((Date.now() - new Date(contract.startedAt).getTime()) / 86400000)
    : 0;

  const tabs = [
    { label: 'Board', href: `/contracts/${contractId}/board` },
    { label: 'Timeline', href: `/contracts/${contractId}/timeline` },
    { label: 'Files', href: `/contracts/${contractId}/files` },
    { label: 'Discussion', href: `/contracts/${contractId}/discussion` },
    { label: 'PM Dashboard', href: `/contracts/${contractId}/pm` },
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
