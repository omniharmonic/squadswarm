import { describe, it, expect } from 'vitest';
import { redactBidForClient } from './access';

// Minimal shape standing in for a full bid row.
const fullBid = {
  id: 'bid-1',
  scopeId: 'scope-1',
  squadId: 'squad-1',
  createdById: 'user-1',
  approach: 'our secret competitive approach',
  roleAssignments: { lead: 'user-1' },
  proposedTimeline: {},
  proposedPrice: '4200.00',
  workPlanModifications: null,
  paymentSchedule: { upfrontPercentage: 25 },
  trackRecord: null,
  governanceStatus: null,
  governanceVotes: null,
  treasuryShareBps: 2000,
  governanceDeadline: null,
  submittedById: 'user-1',
  ratifiedAt: null,
  status: 'submitted',
  createdAt: new Date(),
  updatedAt: new Date(),
} as never;

describe('redactBidForClient', () => {
  it('strips competitor-sensitive fields (price, approach, payment terms)', () => {
    const redacted = redactBidForClient(fullBid) as Record<string, unknown>;
    expect(redacted).not.toHaveProperty('approach');
    expect(redacted).not.toHaveProperty('proposedPrice');
    expect(redacted).not.toHaveProperty('paymentSchedule');
    expect(redacted).not.toHaveProperty('roleAssignments');
    expect(redacted).not.toHaveProperty('treasuryShareBps');
  });

  it('keeps only existence/metadata fields the client may see pre-reveal', () => {
    const redacted = redactBidForClient(fullBid) as Record<string, unknown>;
    expect(redacted.id).toBe('bid-1');
    expect(redacted.scopeId).toBe('scope-1');
    expect(redacted.squadId).toBe('squad-1');
    expect(redacted.status).toBe('submitted');
  });
});
