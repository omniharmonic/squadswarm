'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const MOCK_CONTRACT = {
  id: 'mock-contract-1',
  title: 'Regenerative Finance Dashboard',
  workstreams: [
    {
      id: 'ws-1',
      title: 'Data Pipeline',
      deliverables: [
        { id: 'd-1', title: 'Subgraph Integration', status: 'approved', format: 'codebase', assignee: 'Kai Torres' },
        { id: 'd-2', title: 'Data Normalization Layer', status: 'in_progress', format: 'codebase', assignee: 'CodeSwarm (Agent)' },
        { id: 'd-3', title: 'API Documentation', status: 'not_started', format: 'document', assignee: 'ResearchBot (Agent)' },
      ],
    },
    {
      id: 'ws-2',
      title: 'Frontend Dashboard',
      deliverables: [
        { id: 'd-4', title: 'Dashboard UI Components', status: 'in_review', format: 'codebase', assignee: 'Amara Osei' },
        { id: 'd-5', title: 'Chart Visualizations', status: 'in_progress', format: 'codebase', assignee: 'Benjamin Life' },
        { id: 'd-6', title: 'Mobile Responsive Layout', status: 'not_started', format: 'design', assignee: 'Amara Osei' },
      ],
    },
    {
      id: 'ws-3',
      title: 'Reporting & Export',
      deliverables: [
        { id: 'd-7', title: 'PDF Report Generator', status: 'not_started', format: 'codebase', assignee: 'CodeSwarm (Agent)' },
        { id: 'd-8', title: 'Quarterly Report Template', status: 'blocked', format: 'document', assignee: 'ResearchBot (Agent)' },
      ],
    },
  ],
};

type DeliverableWithWorkstream = {
  id: string;
  title: string;
  status: string;
  format: string;
  assignee: string;
  workstream: string;
};

interface WorkstreamData {
  id: string;
  title: string;
  deliverables: Array<{
    id: string;
    title: string;
    status: string;
    format: string;
    assignee: string;
  }>;
}

const COLUMNS = [
  { key: 'not_started', label: 'Not Started', headerBg: 'bg-bg-secondary' },
  { key: 'in_progress', label: 'In Progress', headerBg: 'bg-accent-client/10' },
  { key: 'in_review', label: 'In Review', headerBg: 'bg-escrow/10' },
  { key: 'revision_requested', label: 'Revision Requested', headerBg: 'bg-warning/10' },
  { key: 'approved', label: 'Approved', headerBg: 'bg-success/10' },
] as const;

const FORMAT_STYLES: Record<string, string> = {
  codebase: 'bg-accent-agent/10 text-accent-agent',
  document: 'bg-bg-secondary text-text-secondary',
  design: 'bg-accent-client/10 text-accent-client',
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  not_started: ['in_progress'],
  in_progress: ['in_review', 'blocked'],
  in_review: ['approved', 'revision_requested'],
  revision_requested: ['in_progress'],
  blocked: ['in_progress'],
};

function getInitials(name: string) {
  return name
    .replace(/\s*\(Agent\)/, '')
    .split(' ')
    .map((n) => n[0])
    .join('');
}

export default function KanbanBoardPage() {
  const params = useParams();
  const contractId = params.contractId as string;
  const [contractTitle, setContractTitle] = useState(MOCK_CONTRACT.title);
  const [allDeliverables, setAllDeliverables] = useState<DeliverableWithWorkstream[]>(() =>
    MOCK_CONTRACT.workstreams.flatMap((ws) =>
      ws.deliverables.map((d) => ({ ...d, workstream: ws.title }))
    )
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchDeliverables = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/deliverables`);
      if (res.ok) {
        const data: WorkstreamData[] = await res.json();
        const flattened = data.flatMap((ws) =>
          ws.deliverables.map((d) => ({ ...d, workstream: ws.title }))
        );
        if (flattened.length > 0) {
          setAllDeliverables(flattened);
        }
        // Try to get contract title
        const contractRes = await fetch(`/api/contracts/${contractId}`);
        if (contractRes.ok) {
          const contractData = await contractRes.json();
          setContractTitle(contractData.title);
        }
      }
    } catch {
      // Keep mock data as fallback
    }
  }, [contractId]);

  useEffect(() => {
    fetchDeliverables();
  }, [fetchDeliverables]);

  async function handleStatusChange(deliverableId: string, newStatus: string) {
    setUpdatingId(deliverableId);
    try {
      const res = await fetch(`/api/deliverables/${deliverableId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setAllDeliverables((prev) =>
          prev.map((d) => (d.id === deliverableId ? { ...d, status: newStatus } : d))
        );
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setUpdatingId(null);
    }
  }

  const getColumnItems = (columnKey: string) => {
    if (columnKey === 'not_started') {
      return allDeliverables.filter((d) => d.status === 'not_started' || d.status === 'blocked');
    }
    return allDeliverables.filter((d) => d.status === columnKey);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Kanban Board</h1>
          <p className="text-text-secondary text-sm mt-1">
            <Link href={`/contracts/${contractId}`} className="hover:text-accent-squad transition-colors">
              {contractTitle}
            </Link>
          </p>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {COLUMNS.map((col) => {
          const items = getColumnItems(col.key);
          return (
            <div key={col.key} className="min-w-[280px] w-[280px] shrink-0">
              {/* Column header */}
              <div className={`rounded-t-lg px-3 py-2.5 ${col.headerBg}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">{col.label}</h3>
                  <span className="text-xs font-medium text-text-secondary bg-white/60 rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>
              </div>

              {/* Column body */}
              <div className="bg-bg-primary/50 border border-t-0 border-border rounded-b-lg p-2 space-y-2 min-h-[200px]">
                {items.length === 0 && (
                  <div className="text-center py-8 text-xs text-text-secondary">
                    No items
                  </div>
                )}
                {items.map((d) => {
                  const isAgent = d.assignee.includes('(Agent)');
                  const isBlocked = d.status === 'blocked';
                  const transitions = ALLOWED_TRANSITIONS[d.status] || [];
                  const isUpdating = updatingId === d.id;

                  return (
                    <div
                      key={d.id}
                      className={`bg-white rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow ${isAgent ? 'border-l-4 border-l-accent-agent' : ''} ${isUpdating ? 'opacity-60' : ''}`}
                    >
                      {/* Title */}
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {d.title}
                      </p>

                      {/* Blocked badge */}
                      {isBlocked && (
                        <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-error/10 text-error">
                          Blocked
                        </span>
                      )}

                      {/* Format badge */}
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${FORMAT_STYLES[d.format] || FORMAT_STYLES.document}`}
                        >
                          {d.format}
                        </span>
                      </div>

                      {/* Status transition buttons */}
                      {transitions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {transitions.map((target) => (
                            <button
                              key={target}
                              onClick={() => handleStatusChange(d.id, target)}
                              disabled={isUpdating}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-bg-secondary text-text-secondary hover:bg-accent-squad/10 hover:text-accent-squad transition-colors disabled:opacity-50"
                            >
                              {target.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Footer: assignee + workstream */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isAgent ? (
                            <div className="w-6 h-6 bg-accent-agent/10 border border-accent-agent/30 rounded-sm rotate-45 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-accent-agent -rotate-45">
                                {getInitials(d.assignee)}
                              </span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-bg-secondary rounded-full flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-text-secondary">
                                {getInitials(d.assignee)}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-text-secondary truncate max-w-[120px]">
                            {d.assignee.replace(' (Agent)', '')}
                          </span>
                        </div>
                        <span className="text-[10px] text-text-secondary truncate max-w-[80px]">
                          {d.workstream}
                        </span>
                      </div>
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
