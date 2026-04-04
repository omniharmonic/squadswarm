export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db, contracts, files, squadMembers, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { getSupabaseAdmin, BUCKETS } from '@/lib/supabase';

async function checkAccess(contractId: string, userId: string) {
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return null;

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
    if (!membership) return null;
  }

  return contract;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;
  const contract = await checkAccess(contractId, session.userId);
  if (!contract) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });

  const rows = await db
    .select()
    .from(files)
    .where(eq(files.contractId, contractId))
    .orderBy(desc(files.createdAt));

  // Resolve uploader names
  const userIds = [...new Set(rows.filter((r) => r.uploadedByUserId).map((r) => r.uploadedByUserId!))];
  const uploaderNames: Record<string, string> = {};
  for (const uid of userIds) {
    const [u] = await db
      .select({ displayName: users.displayName, email: users.email })
      .from(users)
      .where(eq(users.id, uid))
      .limit(1);
    if (u) uploaderNames[uid] = u.displayName || u.email || 'Unknown';
  }

  const enriched = rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    fileType: r.fileType,
    fileUrl: r.fileUrl,
    fileSizeBytes: r.fileSizeBytes,
    version: r.version,
    uploadedBy: r.uploadedByUserId ? uploaderNames[r.uploadedByUserId] || 'Unknown' : 'Unknown',
    isAgent: !!r.uploadedByAgentId,
    createdAt: r.createdAt,
  }));

  return NextResponse.json(enriched);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;
  const contract = await checkAccess(contractId, session.userId);
  if (!contract) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const timestamp = Date.now();
  const storagePath = `${contractId}/${timestamp}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKETS.DELIVERABLE_FILES)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed', details: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKETS.DELIVERABLE_FILES)
    .getPublicUrl(storagePath);

  const fileUrl = urlData.publicUrl;

  const [inserted] = await db
    .insert(files)
    .values({
      contractId,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileUrl,
      fileSizeBytes: file.size,
      uploadedByUserId: session.userId,
    })
    .returning();

  // Resolve uploader name
  const [u] = await db
    .select({ displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!inserted) return NextResponse.json({ error: 'Failed to create file record' }, { status: 500 });

  return NextResponse.json({
    id: inserted.id,
    fileName: inserted.fileName,
    fileType: inserted.fileType,
    fileUrl: inserted.fileUrl,
    fileSizeBytes: inserted.fileSizeBytes,
    version: inserted.version,
    uploadedBy: u?.displayName || u?.email || 'Unknown',
    isAgent: false,
    createdAt: inserted.createdAt,
  });
}
