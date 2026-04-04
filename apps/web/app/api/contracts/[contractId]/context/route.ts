export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, squadMembers, workstreams, deliverables, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

type CollaborationLink = { type: string; label: string; url: string; addedBy?: string };

async function authorizeContractParticipant(contractId: string, userId: string) {
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return { error: 'Contract not found', status: 404, contract: null, isMember: false };

  const isClient = contract.clientId === userId;
  let isMember = false;
  if (!isClient) {
    const [membership] = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, contract.squadId),
          eq(squadMembers.userId, userId)
        )
      )
      .limit(1);
    if (!membership) return { error: 'Forbidden', status: 403, contract: null, isMember: false };
    isMember = true;
  }

  return { error: null, status: 200, contract, isMember };
}

async function generateInitialContext(contractId: string, contract: { title: string; squadId: string; clientId: string }) {
  // Fetch workstreams
  const wsRows = await db
    .select()
    .from(workstreams)
    .where(eq(workstreams.contractId, contractId))
    .orderBy(workstreams.orderIndex);

  // Fetch deliverables
  const delRows = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.contractId, contractId));

  // Fetch squad members
  const members = await db
    .select()
    .from(squadMembers)
    .where(eq(squadMembers.squadId, contract.squadId));

  const memberNames: string[] = [];
  for (const m of members) {
    const [u] = await db.select({ displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, m.userId)).limit(1);
    if (u) memberNames.push(`- ${u.displayName || u.email} (${m.role})`);
  }

  // Fetch client name
  const [client] = await db
    .select({ displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, contract.clientId))
    .limit(1);

  // Build collaboration links section
  const links = ((contract as Record<string, unknown>).collaborationLinks as CollaborationLink[]) || [];
  const linksSection = links.length > 0
    ? links.map((l: CollaborationLink) => `- [${l.label}](${l.url})`).join('\n')
    : '_No collaboration links added yet._';

  // Build workstream summaries
  const workstreamSummaries = wsRows.map(ws => {
    const wsDeliverables = delRows.filter(d => d.workstreamId === ws.id);
    const deliverablesList = wsDeliverables.map(d => `  - ${d.title} (${d.status.replace(/_/g, ' ')})`).join('\n');
    return `### ${ws.title}\n${deliverablesList || '  _No deliverables_'}`;
  }).join('\n\n');

  return `# ${contract.title}

## Scope
_Add scope narrative here._

## Team
- ${client?.displayName || client?.email || 'Client'} (Client)
${memberNames.join('\n')}

## Collaboration Spaces
${linksSection}

## Work Plan
${workstreamSummaries || '_No workstreams defined yet._'}
`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;
  const auth = await authorizeContractParticipant(contractId, session.userId);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let context = auth.contract!.projectContext;

  // Auto-generate initial context if empty
  if (!context) {
    context = await generateInitialContext(contractId, auth.contract as { title: string; squadId: string; clientId: string });
    // Save the generated context
    await db
      .update(contracts)
      .set({ projectContext: context, updatedAt: new Date() })
      .where(eq(contracts.id, contractId));
  }

  return NextResponse.json({ context });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;
  const auth = await authorizeContractParticipant(contractId, session.userId);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Only squad members can edit context
  if (!auth.isMember) {
    return NextResponse.json({ error: 'Only squad members can edit project context' }, { status: 403 });
  }

  const body = await req.json();
  const { context } = body;

  if (typeof context !== 'string') {
    return NextResponse.json({ error: 'context must be a string' }, { status: 400 });
  }

  const [updated] = await db
    .update(contracts)
    .set({ projectContext: context, updatedAt: new Date() })
    .where(eq(contracts.id, contractId))
    .returning();

  return NextResponse.json({ context: updated?.projectContext ?? context });
}
