export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, squadMembers } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

type CollaborationLink = { type: string; label: string; url: string; addedBy?: string };

const VALID_LINK_TYPES = ['notion', 'github', 'google_drive', 'figma', 'discord', 'slack', 'linear', 'custom'];

async function authorizeContractParticipant(contractId: string, userId: string) {
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return { error: 'Contract not found', status: 404, contract: null };

  const isClient = contract.clientId === userId;
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
    if (!membership) return { error: 'Forbidden', status: 403, contract: null };
  }

  return { error: null, status: 200, contract };
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

  const links = (auth.contract!.collaborationLinks as CollaborationLink[]) || [];
  return NextResponse.json({ links });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;
  const auth = await authorizeContractParticipant(contractId, session.userId);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { action, link } = body;

  if (!action || !['add', 'remove'].includes(action)) {
    return NextResponse.json({ error: 'action must be "add" or "remove"' }, { status: 400 });
  }

  if (!link || !link.url) {
    return NextResponse.json({ error: 'link with url is required' }, { status: 400 });
  }

  const currentLinks = (auth.contract!.collaborationLinks as CollaborationLink[]) || [];

  let updatedLinks: CollaborationLink[];
  if (action === 'add') {
    if (!link.type || !VALID_LINK_TYPES.includes(link.type)) {
      return NextResponse.json({ error: `type must be one of: ${VALID_LINK_TYPES.join(', ')}` }, { status: 400 });
    }
    if (!link.label) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }
    updatedLinks = [...currentLinks, { type: link.type, label: link.label, url: link.url, addedBy: session.userId }];
  } else {
    updatedLinks = currentLinks.filter((l: CollaborationLink) => l.url !== link.url);
  }

  const [updated] = await db
    .update(contracts)
    .set({ collaborationLinks: updatedLinks, updatedAt: new Date() })
    .where(eq(contracts.id, contractId))
    .returning();

  return NextResponse.json({ links: (updated?.collaborationLinks ?? []) as CollaborationLink[] });
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

  const body = await req.json();
  const { links } = body;

  if (!Array.isArray(links)) {
    return NextResponse.json({ error: 'links must be an array' }, { status: 400 });
  }

  for (const link of links) {
    if (!link.type || !VALID_LINK_TYPES.includes(link.type)) {
      return NextResponse.json({ error: `Invalid link type: ${link.type}` }, { status: 400 });
    }
    if (!link.label || !link.url) {
      return NextResponse.json({ error: 'Each link must have type, label, and url' }, { status: 400 });
    }
  }

  const [updated] = await db
    .update(contracts)
    .set({ collaborationLinks: links, updatedAt: new Date() })
    .where(eq(contracts.id, contractId))
    .returning();

  return NextResponse.json({ links: (updated?.collaborationLinks ?? []) as CollaborationLink[] });
}
