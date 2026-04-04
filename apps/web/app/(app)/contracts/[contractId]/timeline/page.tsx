'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Deliverable {
  id: string;
  title: string;
  status: string;
  assignee: string;
  dueDate: string | null;
  completedAt: string | null;
}

interface Workstream {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  deliverables: Deliverable[];
}

interface ContractData {
  id: string;
  title: string;
  status: string;
  startedAt: string | null;
  workstreams: Workstream[];
}

const MOCK_CONTRACT: ContractData = {
  id: 'mock-contract-1',
  title: 'Regenerative Finance Dashboard',
  status: 'active',
  startedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  workstreams: [
    {
      id: 'ws-1',
      title: 'Data Pipeline',
      description: 'Subgraph integration and data normalization',
      status: 'in_progress',
      startDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      deliverables: [
        { id: 'd1', title: 'Subgraph schema mapping', status: 'completed', assignee: 'CodeSwarm (Agent)', dueDate: new Date(Date.now() - 7 * 86400000).toISOString(), completedAt: new Date(Date.now() - 8 * 86400000).toISOString() },
        { id: 'd2', title: 'Data normalization layer', status: 'completed', assignee: 'CodeSwarm (Agent)', dueDate: new Date(Date.now() - 3 * 86400000).toISOString(), completedAt: new Date(Date.now() - 4 * 86400000).toISOString() },
        { id: 'd3', title: 'API endpoints', status: 'in_progress', assignee: 'Benjamin Life', dueDate: new Date(Date.now() + 3 * 86400000).toISOString(), completedAt: null },
        { id: 'd4', title: 'Integration tests', status: 'not_started', assignee: 'CodeSwarm (Agent)', dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), completedAt: null },
      ],
    },
    {
      id: 'ws-2',
      title: 'Frontend Dashboard',
      description: 'React components and data visualizations',
      status: 'not_started',
      startDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 21 * 86400000).toISOString(),
      deliverables: [
        { id: 'd5', title: 'Dashboard layout and navigation', status: 'not_started', assignee: 'Amara Osei', dueDate: new Date(Date.now() + 10 * 86400000).toISOString(), completedAt: null },
        { id: 'd6', title: 'Carbon metrics visualizations', status: 'not_started', assignee: 'Amara Osei', dueDate: new Date(Date.now() + 14 * 86400000).toISOString(), completedAt: null },
        { id: 'd7', title: 'Tooltip copy and UX writing', status: 'not_started', assignee: 'ResearchBot (Agent)', dueDate: new Date(Date.now() + 12 * 86400000).toISOString(), completedAt: null },
      ],
    },
    {
      id: 'ws-3',
      title: 'Reporting & Export',
      description: 'PDF export and scheduled reports',
      status: 'not_started',
      startDate: new Date(Date.now() + 18 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 28 * 86400000).toISOString(),
      deliverables: [
        { id: 'd8', title: 'PDF report template', status: 'not_started', assignee: 'Benjamin Life', dueDate: new Date(Date.now() + 22 * 86400000).toISOString(), completedAt: null },
        { id: 'd9', title: 'Scheduled export system', status: 'not_started', assignee: 'CodeSwarm (Agent)', dueDate: new Date(Date.now() + 26 * 86400000).toISOString(), completedAt: null },
      ],
    },
  ],
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: 'Completed', color: 'text-success', bg: 'bg-success' },
  in_progress: { label: 'In Progress', color: 'text-accent-client', bg: 'bg-accent-client' },
  not_started: { label: 'Not Started', color: 'text-text-secondary', bg: 'bg-border' },
  blocked: { label: 'Blocked', color: 'text-error', bg: 'bg-error' },
};

function formatDate(iso: string | null) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TimelinePage() {
  const params = useParams();
  const contractId = params.contractId as string;

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContract() {
      try {
        const res = await fetch(`/api/contracts/${contractId}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setContract(data);
      } catch {
        setContract(MOCK_CONTRACT);
      } finally {
        setLoading(false);
      }
    }
    fetchContract();
  }, [contractId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-bg-secondary rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-6 space-y-3">
            <div className="h-5 w-40 bg-bg-secondary rounded animate-pulse" />
            <div className="h-4 w-full bg-bg-secondary rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-bg-secondary rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!contract) return null;

  const allDeliverables = contract.workstreams.flatMap((ws) => ws.deliverables);
  const completedCount = allDeliverables.filter((d) => d.status === 'completed').length;
  const totalCount = allDeliverables.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Timeline</h1>
        <p className="text-text-secondary text-sm mt-1">
          <Link href={`/contracts/${contractId}`} className="hover:text-accent-squad transition-colors">
            {contract.title}
          </Link>
        </p>
      </div>

      {/* Overall Progress */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Overall Progress</h2>
          <span className="text-sm font-medium text-text-primary">
            {completedCount}/{totalCount} deliverables ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-bg-secondary rounded-full h-3">
          <div
            className="bg-success h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {contract.startedAt && (
          <p className="text-xs text-text-secondary mt-2">
            Started {formatDate(contract.startedAt)}
          </p>
        )}
      </div>

      {/* Vertical Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

        {contract.workstreams.map((ws, wsIndex) => {
          const wsCompleted = ws.deliverables.filter((d) => d.status === 'completed').length;
          const wsTotal = ws.deliverables.length;
          const wsStatusKey = ws.status in STATUS_CONFIG ? ws.status : 'not_started';
          const wsStatus = STATUS_CONFIG[wsStatusKey]!;

          return (
            <div key={ws.id} className="relative mb-8 last:mb-0">
              {/* Workstream node */}
              <div className="flex items-start gap-4">
                <div
                  className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    ws.status === 'completed'
                      ? 'bg-success border-success text-white'
                      : ws.status === 'in_progress'
                        ? 'bg-white border-accent-client text-accent-client'
                        : 'bg-white border-border text-text-secondary'
                  }`}
                >
                  <span className="text-xs font-bold">{wsIndex + 1}</span>
                </div>

                <div className="flex-1 bg-white rounded-xl border border-border p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-text-primary">{ws.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wsStatus.color} bg-opacity-10 ${wsStatus.bg}`}>
                      {wsStatus.label}
                    </span>
                  </div>
                  {ws.description && (
                    <p className="text-sm text-text-secondary mb-3">{ws.description}</p>
                  )}
                  <div className="text-xs text-text-secondary mb-4">
                    {formatDate(ws.startDate)} &mdash; {formatDate(ws.endDate)} &middot; {wsCompleted}/{wsTotal} done
                  </div>

                  {/* Deliverables */}
                  <div className="space-y-2">
                    {ws.deliverables.map((del) => {
                      const delStatusKey = del.status in STATUS_CONFIG ? del.status : 'not_started';
                      const delStatus = STATUS_CONFIG[delStatusKey]!;
                      const isAgent = del.assignee.includes('Agent');
                      return (
                        <div
                          key={del.id}
                          className="flex items-center gap-3 py-2 px-3 rounded-lg bg-bg-primary"
                        >
                          {/* Status dot */}
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${delStatus.bg}`} />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{del.title}</p>
                            <p className={`text-xs ${isAgent ? 'text-accent-agent' : 'text-text-secondary'}`}>
                              {del.assignee} &middot; Due {formatDate(del.dueDate)}
                            </p>
                          </div>

                          <span className={`text-xs font-medium shrink-0 ${delStatus.color}`}>
                            {delStatus.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
