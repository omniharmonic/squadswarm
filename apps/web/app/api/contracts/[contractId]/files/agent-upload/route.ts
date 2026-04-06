export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, contracts, files, activityLog } from '@squadswarm/db';
import { getAgentSession } from '@/lib/agent-auth';
import { uploadToBlob } from '@/lib/blob-storage';

/**
 * Agent file upload endpoint.
 * Accepts JSON body with file content (base64 or plain text) instead of multipart form data,
 * since MCP tools pass file content as strings.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const agentSession = await getAgentSession(req);
  if (!agentSession) {
    return NextResponse.json({ error: 'Agent authentication required' }, { status: 401 });
  }

  const { contractId } = await params;

  if (agentSession.contractId !== contractId) {
    return NextResponse.json({ error: 'Token not scoped to this contract' }, { status: 403 });
  }

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  let body: {
    deliverableId?: string;
    fileName?: string;
    content?: string;
    agentId?: string;
    isFinal?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { deliverableId, fileName, content, isFinal } = body;

  if (!fileName) {
    return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  // Determine file type from extension
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/typescript',
    py: 'text/x-python',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    zip: 'application/zip',
  };
  const fileType = mimeTypes[ext] || 'application/octet-stream';

  // Detect if content is base64-encoded
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(content.slice(0, 100)) && content.length > 100;
  const buffer = isBase64
    ? Buffer.from(content, 'base64')
    : Buffer.from(content, 'utf-8');
  const fileSizeBytes = buffer.length;

  let fileUrl: string;
  try {
    const { url } = await uploadToBlob(fileName, buffer, fileType);
    fileUrl = url;
  } catch (uploadError) {
    return NextResponse.json(
      { error: 'Upload failed', details: uploadError instanceof Error ? uploadError.message : 'Unknown error' },
      { status: 500 }
    );
  }

  const [inserted] = await db
    .insert(files)
    .values({
      contractId,
      deliverableId: deliverableId || null,
      fileName,
      fileType,
      fileUrl,
      fileSizeBytes,
      uploadedByAgentId: agentSession.agentId,
      isFinalSubmission: isFinal || false,
    })
    .returning();

  if (!inserted) {
    return NextResponse.json({ error: 'Failed to create file record' }, { status: 500 });
  }

  // Log activity
  await db.insert(activityLog).values({
    contractId,
    actorAgentId: agentSession.agentId,
    action: isFinal ? 'agent_final_file_uploaded' : 'agent_file_uploaded',
    entityType: 'file',
    entityId: inserted.id,
    metadata: {
      fileName,
      fileType,
      fileSizeBytes,
      deliverableId: deliverableId || null,
      isFinal: isFinal || false,
    },
  });

  return NextResponse.json({
    id: inserted.id,
    fileName: inserted.fileName,
    fileType: inserted.fileType,
    fileSizeBytes: inserted.fileSizeBytes,
    version: inserted.version,
    isFinalSubmission: inserted.isFinalSubmission,
    deliverableId: deliverableId || null,
    isAgent: true,
    createdAt: inserted.createdAt,
  }, { status: 201 });
}
