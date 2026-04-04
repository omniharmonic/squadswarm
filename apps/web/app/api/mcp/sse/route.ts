export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, agents } from '@squadswarm/db';
import { createHash } from 'crypto';
import {
  getAgentTasks,
  getProjectContext,
  updateDeliverableStatus,
  flagBlocker,
  postAgentMessage,
  getContractMessages,
  getDeliverableAcceptanceCriteria,
  submitDailyLog,
  getCollaborationLinks,
} from '@/lib/mcp-services';

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

  const body = await req.json();
  const { tool, params, contractId } = body;

  if (!contractId) {
    return NextResponse.json({ error: 'contractId required' }, { status: 400 });
  }

  try {
    switch (tool) {
      case 'get_my_tasks': {
        const tasks = await getAgentTasks(agent.id, contractId);
        return NextResponse.json({ result: tasks });
      }

      case 'get_project_context': {
        const context = await getProjectContext(contractId);
        if (!context) {
          return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
        }
        return NextResponse.json({ result: context });
      }

      case 'update_task_status': {
        if (!params?.deliverableId || !params?.status) {
          return NextResponse.json({ error: 'deliverableId and status required' }, { status: 400 });
        }
        const updated = await updateDeliverableStatus(
          params.deliverableId,
          params.status,
          agent.id,
          params.note
        );
        if (!updated) {
          return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
        }
        return NextResponse.json({ result: updated });
      }

      case 'flag_blocker': {
        if (!params?.deliverableId || !params?.reason) {
          return NextResponse.json({ error: 'deliverableId and reason required' }, { status: 400 });
        }
        const blocked = await flagBlocker(params.deliverableId, params.reason, agent.id);
        if (!blocked) {
          return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
        }
        return NextResponse.json({ result: blocked });
      }

      case 'post_message': {
        if (!params?.channelType || !params?.content) {
          return NextResponse.json({ error: 'channelType and content required' }, { status: 400 });
        }
        const msg = await postAgentMessage(
          contractId,
          params.channelType,
          params.channelId || null,
          params.content,
          agent.id
        );
        return NextResponse.json({ result: msg });
      }

      case 'get_messages': {
        const msgs = await getContractMessages(
          contractId,
          params?.channelType,
          params?.limit || 20
        );
        return NextResponse.json({ result: msgs });
      }

      case 'get_acceptance_criteria': {
        if (!params?.deliverableId) {
          return NextResponse.json({ error: 'deliverableId required' }, { status: 400 });
        }
        const criteria = await getDeliverableAcceptanceCriteria(params.deliverableId);
        return NextResponse.json({ result: criteria });
      }

      case 'submit_daily_log': {
        if (!params?.summary || params?.hoursWorked == null || !params?.deliverableIds) {
          return NextResponse.json({ error: 'summary, hoursWorked, and deliverableIds required' }, { status: 400 });
        }
        const logResult = await submitDailyLog(
          contractId,
          agent.id,
          params.summary,
          params.hoursWorked,
          params.deliverableIds
        );
        return NextResponse.json({ result: logResult });
      }

      case 'get_collaboration_links': {
        const links = await getCollaborationLinks(contractId);
        return NextResponse.json({ result: links });
      }

      case 'upload_file': {
        // File upload requires storage integration (Supabase Storage) — stub for now
        return NextResponse.json({
          result: {
            success: false,
            message: 'File upload not yet implemented. Storage integration required.',
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
    version: '0.1.0',
    description: 'MCP server for AI agent participation in SquadSwarm contracts',
    tools: 9,
    resources: 1,
  });
}
