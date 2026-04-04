export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, contracts, deliverables } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  if (contract.clientId !== session.userId) {
    return NextResponse.json({ error: 'Only the client can complete a contract' }, { status: 403 });
  }
  if (contract.status !== 'active' && contract.status !== 'in_review') {
    return NextResponse.json({ error: `Cannot complete a contract in ${contract.status} status` }, { status: 400 });
  }

  // Check all deliverables are approved
  const pendingDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.contractId, contractId));

  const unapproved = pendingDeliverables.filter((d) => d.status !== 'approved');
  if (unapproved.length > 0) {
    return NextResponse.json({
      error: `${unapproved.length} deliverable(s) not yet approved`,
      unapproved: unapproved.map((d) => ({ id: d.id, title: d.title, status: d.status })),
    }, { status: 400 });
  }

  // Mark contract as completed
  const [updated] = await db
    .update(contracts)
    .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
    .where(eq(contracts.id, contractId))
    .returning();

  return NextResponse.json(updated);
}
