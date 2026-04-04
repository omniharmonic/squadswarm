export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { db, attestations, contracts } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get attestations where user is involved (as client or squad member)
  const userAttestations = await db
    .select()
    .from(attestations)
    .where(eq(attestations.userId, session.userId));

  // Also get attestations for contracts where user was the client
  const clientContracts = await db
    .select({ id: contracts.id })
    .from(contracts)
    .where(eq(contracts.clientId, session.userId));

  const contractIds = clientContracts.map((c) => c.id);

  // Combine
  const allAttestations = [...userAttestations];

  // Add contract-based attestations not already included
  if (contractIds.length > 0) {
    for (const cid of contractIds) {
      const contractAttestations = await db
        .select()
        .from(attestations)
        .where(eq(attestations.contractId, cid));
      for (const a of contractAttestations) {
        if (!allAttestations.find((existing) => existing.id === a.id)) {
          allAttestations.push(a);
        }
      }
    }
  }

  return NextResponse.json(allAttestations);
}
