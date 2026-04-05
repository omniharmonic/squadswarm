export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, agents } from '@squadswarm/db';
import { getAgentSession } from '@/lib/agent-auth';
import { createHash } from 'crypto';

/**
 * MCP server endpoint for AI agents.
 *
 * Supports two auth methods:
 * 1. JWT Bearer token (new — scoped to agent+contract, created via /api/agents/[id]/connect)
 * 2. API key hash (legacy — looked up from agents.apiKeyHash)
 *
 * POST: Execute an MCP tool call
 * GET: Server info
 */

async function authenticateAgentLegacy(req: NextRequest) {
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
  // Try JWT agent auth first, then fall back to legacy API key auth
  const agentSession = await getAgentSession(req);

  let agentId: string;
  let contractId: string | undefined;

  if (agentSession) {
    agentId = agentSession.agentId;
    contractId = agentSession.contractId;
  } else {
    const legacyAgent = await authenticateAgentLegacy(req);
    if (!legacyAgent) {
      return NextResponse.json({ error: 'Invalid agent credentials' }, { status: 401 });
    }
    agentId = legacyAgent.id;
  }

  const body = await req.json();
  const { tool, params: toolParams, contractId: bodyContractId } = body;

  // Use contractId from JWT if available, otherwise from body
  const resolvedContractId = contractId || bodyContractId;

  if (!resolvedContractId) {
    return NextResponse.json({ error: 'contractId required' }, { status: 400 });
  }

  // Verify agent-token scope if using JWT
  if (agentSession && agentSession.contractId !== resolvedContractId) {
    return NextResponse.json({ error: 'Token not scoped to this contract' }, { status: 403 });
  }

  // Import service functions lazily to keep the module clean
  const {
    getAgentTasks,
    getProjectContext,
    updateDeliverableStatus,
    flagBlocker,
    postAgentMessage,
    getContractMessages,
    getDeliverableAcceptanceCriteria,
    submitDailyLog,
    getCollaborationLinks,
  } = await import('@/lib/mcp-services');

  try {
    switch (tool) {
      case 'get_my_tasks': {
        const tasks = await getAgentTasks(agentId, resolvedContractId);
        return NextResponse.json({ result: tasks });
      }

      case 'get_project_context': {
        const context = await getProjectContext(resolvedContractId);
        if (!context) {
          return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
        }
        return NextResponse.json({ result: context });
      }

      case 'update_task_status': {
        if (!toolParams?.deliverableId || !toolParams?.status) {
          return NextResponse.json({ error: 'deliverableId and status required' }, { status: 400 });
        }
        const updated = await updateDeliverableStatus(
          toolParams.deliverableId,
          toolParams.status,
          agentId,
          toolParams.note
        );
        if (!updated) {
          return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
        }
        return NextResponse.json({ result: updated });
      }

      case 'flag_blocker': {
        if (!toolParams?.deliverableId || !toolParams?.reason) {
          return NextResponse.json({ error: 'deliverableId and reason required' }, { status: 400 });
        }
        const blocked = await flagBlocker(toolParams.deliverableId, toolParams.reason, agentId);
        if (!blocked) {
          return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
        }
        return NextResponse.json({ result: blocked });
      }

      case 'post_message': {
        if (!toolParams?.channelType || !toolParams?.content) {
          return NextResponse.json({ error: 'channelType and content required' }, { status: 400 });
        }
        const msg = await postAgentMessage(
          resolvedContractId,
          toolParams.channelType,
          toolParams.channelId || null,
          toolParams.content,
          agentId
        );
        return NextResponse.json({ result: msg });
      }

      case 'get_messages': {
        const msgs = await getContractMessages(
          resolvedContractId,
          toolParams?.channelType,
          toolParams?.limit || 20
        );
        return NextResponse.json({ result: msgs });
      }

      case 'get_acceptance_criteria': {
        if (!toolParams?.deliverableId) {
          return NextResponse.json({ error: 'deliverableId required' }, { status: 400 });
        }
        const criteria = await getDeliverableAcceptanceCriteria(toolParams.deliverableId);
        return NextResponse.json({ result: criteria });
      }

      case 'submit_daily_log': {
        if (!toolParams?.summary || toolParams?.hoursWorked == null || !toolParams?.deliverableIds) {
          return NextResponse.json({ error: 'summary, hoursWorked, and deliverableIds required' }, { status: 400 });
        }
        const logResult = await submitDailyLog(
          resolvedContractId,
          agentId,
          toolParams.summary,
          toolParams.hoursWorked,
          toolParams.deliverableIds
        );
        return NextResponse.json({ result: logResult });
      }

      case 'get_collaboration_links': {
        const links = await getCollaborationLinks(resolvedContractId);
        return NextResponse.json({ result: links });
      }

      case 'upload_file': {
        return NextResponse.json({
          result: {
            success: false,
            message: 'Use the MCP SDK tool "upload_file" which calls the /api/contracts/{id}/files/agent-upload endpoint directly.',
          },
        });
      }

      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (error) {
    console.error(`MCP tool error [${tool}]:`, error);
    return NextResponse.json(
      { error: 'Internal server error processing tool call' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'SquadSwarm MCP Server',
    version: '0.2.0',
    description: 'MCP server for AI agent participation in SquadSwarm contracts',
    tools: 11,
    resources: 1,
    auth: 'Bearer token (JWT from /api/agents/{id}/connect or legacy API key)',
  });
}
