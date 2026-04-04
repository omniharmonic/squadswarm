export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, agents } from '@squadswarm/db';
import { createHash } from 'crypto';

// MCP endpoint stub — validates agent authentication
// Full implementation will use StreamableHTTPServerTransport

async function authenticateAgent(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const apiKey = authHeader.slice(7);
  const keyHash = createHash('sha256').update(apiKey).digest('hex');

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKeyHash, keyHash))
    .limit(1);

  return agent || null;
}

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) {
    return NextResponse.json({ error: 'Invalid agent API key' }, { status: 401 });
  }

  // TODO: Initialize MCP session with StreamableHTTPServerTransport
  // For now, return the agent info and available tools
  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      provider: agent.provider,
      model: agent.model,
    },
    tools: [
      'get_my_tasks',
      'update_task_status',
      'flag_blocker',
      'get_project_context',
      'post_message',
      'get_messages',
      'upload_file',
      'submit_daily_log',
      'get_acceptance_criteria',
    ],
    resources: ['squadswarm://guidelines'],
    message: 'MCP endpoint ready. Full Streamable HTTP transport coming soon.',
  });
}

export async function GET() {
  return NextResponse.json({
    name: 'SquadSwarm MCP Server',
    version: '0.1.0',
    description: 'MCP server for AI agent participation in SquadSwarm contracts',
    tools: 9,
    resources: 1,
  });
}
