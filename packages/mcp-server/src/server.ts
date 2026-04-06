import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import { apiCall, type ApiClientConfig } from './api-client';

export interface AgentContext {
  agentId: string;
  agentName: string;
  ownerId: string;
  contractId: string;
  autonomyLevel: 'supervised' | 'trusted' | 'autonomous';
  token: string;
  baseUrl: string;
}

function makeConfig(context: AgentContext): ApiClientConfig {
  return { baseUrl: context.baseUrl, token: context.token };
}

function ok(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(error: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    ],
    isError: true as const,
  };
}

export function createSquadSwarmMcpServer(context: AgentContext) {
  const server = new McpServer({
    name: 'squadswarm',
    version: '0.1.0',
  });

  const config = makeConfig(context);

  // ── Task Management ──

  server.tool(
    'get_my_tasks',
    'Get all deliverables assigned to this agent in the current contract',
    {
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g. not_started, in_progress, in_review, blocked)'),
    },
    async ({ status }) => {
      try {
        const data = await apiCall<{
          workstreams: Array<{
            id: string;
            title: string;
            deliverables: Array<{
              id: string;
              title: string;
              status: string;
              assignedAgent: { id: string; name: string } | null;
              [key: string]: unknown;
            }>;
          }>;
        }>(config, 'GET', `/api/contracts/${context.contractId}/board`);

        // Flatten and filter to only this agent's deliverables
        let myTasks = data.workstreams.flatMap((ws) =>
          ws.deliverables
            .filter((d) => d.assignedAgent?.id === context.agentId)
            .map((d) => ({ ...d, workstream: ws.title, workstreamId: ws.id })),
        );

        if (status) {
          myTasks = myTasks.filter((d) => d.status === status);
        }

        return ok({
          contractId: context.contractId,
          agentId: context.agentId,
          tasks: myTasks,
          total: myTasks.length,
        });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'update_task_status',
    'Update the status of an assigned deliverable',
    {
      deliverableId: z.string().uuid().describe('The deliverable ID'),
      status: z.enum(['in_progress', 'in_review', 'blocked']).describe('New status'),
      note: z.string().optional().describe('Optional note about the status change'),
    },
    async ({ deliverableId, status, note }) => {
      try {
        const updated = await apiCall(
          config,
          'PATCH',
          `/api/contracts/${context.contractId}/deliverables/${deliverableId}/status`,
          { status, note },
        );
        return ok(updated);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'flag_blocker',
    'Flag a deliverable as blocked with a reason',
    {
      deliverableId: z.string().uuid().describe('The deliverable ID'),
      reason: z.string().describe('Why this deliverable is blocked'),
      severity: z
        .enum(['low', 'medium', 'high', 'critical'])
        .default('medium')
        .describe('Severity of the blocker'),
    },
    async ({ deliverableId, reason, severity }) => {
      try {
        // 1. Update deliverable status to blocked
        await apiCall(
          config,
          'PATCH',
          `/api/contracts/${context.contractId}/deliverables/${deliverableId}/status`,
          { status: 'blocked', note: reason },
        );

        // 2. Post a message about the blocker
        await apiCall(
          config,
          'POST',
          `/api/contracts/${context.contractId}/messages`,
          {
            content: `🚫 BLOCKER [${severity.toUpperCase()}]: ${reason}\n\nDeliverable: ${deliverableId}`,
            channelType: 'general',
          },
        );

        return ok({
          success: true,
          deliverableId,
          status: 'blocked',
          severity,
          reason,
          statusUpdated: true,
          messagePosted: true,
        });
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get_project_context',
    'Get full project context including contract details, workstreams, and team',
    {},
    async () => {
      try {
        const data = await apiCall(
          config,
          'GET',
          `/api/contracts/${context.contractId}`,
        );
        return ok(data);
      } catch (e) {
        return err(e);
      }
    },
  );

  // ── Communication ──

  server.tool(
    'post_message',
    'Post a message to a contract discussion channel',
    {
      channelType: z.enum(['general', 'workstream', 'deliverable']).describe('Channel type'),
      channelId: z.string().optional().describe('Channel ID (workstream or deliverable ID)'),
      content: z.string().describe('Message content (markdown supported)'),
    },
    async ({ channelType, channelId, content: msgContent }) => {
      try {
        const message = await apiCall(
          config,
          'POST',
          `/api/contracts/${context.contractId}/messages`,
          {
            content: msgContent,
            channelType,
            channelId: channelId || undefined,
          },
        );
        return ok(message);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get_messages',
    'Get recent messages from a contract discussion channel',
    {
      channelType: z.enum(['general', 'workstream', 'deliverable']).describe('Channel type'),
      channelId: z.string().optional().describe('Channel ID'),
      limit: z.number().int().min(1).max(50).default(20).describe('Number of messages'),
    },
    async ({ channelType, channelId, limit }) => {
      try {
        const params = new URLSearchParams();
        params.set('channelType', channelType);
        if (channelId) params.set('channelId', channelId);
        params.set('limit', String(limit));

        const data = await apiCall(
          config,
          'GET',
          `/api/contracts/${context.contractId}/messages?${params.toString()}`,
        );
        return ok(data);
      } catch (e) {
        return err(e);
      }
    },
  );

  // ── File Operations ──

  server.tool(
    'upload_file',
    'Upload a file as a deliverable attachment',
    {
      deliverableId: z.string().uuid().describe('The deliverable to attach the file to'),
      fileName: z.string().describe('File name'),
      content: z.string().describe('File content (base64 encoded for binary, plain text for text files)'),
      isFinal: z.boolean().default(false).describe('Mark as final submission (moves deliverable to in_review)'),
    },
    async ({ deliverableId, fileName, content: fileContent, isFinal }) => {
      try {
        const result = await apiCall(
          config,
          'POST',
          `/api/contracts/${context.contractId}/files/agent-upload`,
          {
            deliverableId,
            fileName,
            content: fileContent,
            isFinal: isFinal || false,
          },
        );
        return ok(result);
      } catch (e) {
        return err(e);
      }
    },
  );

  // ── Reporting ──

  server.tool(
    'submit_daily_log',
    'Submit a daily activity log summarizing work completed',
    {
      summary: z.string().describe('Summary of work done today'),
      hoursWorked: z.number().min(0).max(24).describe('Hours worked'),
      deliverableIds: z.array(z.string().uuid()).describe('Deliverables worked on'),
    },
    async ({ summary, hoursWorked, deliverableIds }) => {
      try {
        // Try posting to activity endpoint first, fall back to messages
        try {
          const result = await apiCall(
            config,
            'POST',
            `/api/contracts/${context.contractId}/activity`,
            {
              action: 'daily_log',
              metadata: {
                summary,
                hoursWorked,
                deliverableIds,
                agentId: context.agentId,
              },
            },
          );
          return ok(result);
        } catch {
          // Fallback: post as a message to internal channel
          const deliverableList =
            deliverableIds.length > 0
              ? `\nDeliverables: ${deliverableIds.join(', ')}`
              : '';
          const message = await apiCall(
            config,
            'POST',
            `/api/contracts/${context.contractId}/messages`,
            {
              content: `📋 Daily Log from ${context.agentName}:\n${summary}\nHours: ${hoursWorked ?? 'N/A'}${deliverableList}`,
              channelType: 'internal',
            },
          );
          return ok({
            ...message as object,
            fallback: true,
            message: 'Daily log posted as message (activity endpoint not available)',
          });
        }
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get_acceptance_criteria',
    'Get the acceptance criteria for a specific deliverable',
    {
      deliverableId: z.string().uuid().describe('The deliverable ID'),
    },
    async ({ deliverableId }) => {
      try {
        const data = await apiCall<{
          workstreams: Array<{
            deliverables: Array<{
              id: string;
              title: string;
              status: string;
              format: string | null;
              acceptanceCriteria: unknown;
              [key: string]: unknown;
            }>;
          }>;
        }>(config, 'GET', `/api/contracts/${context.contractId}/board`);

        // Find the deliverable across all workstreams
        const deliverable = data.workstreams
          .flatMap((ws) => ws.deliverables)
          .find((d) => d.id === deliverableId);

        if (!deliverable) {
          return ok({
            error: 'Deliverable not found',
            deliverableId,
          });
        }

        return ok({
          deliverableId: deliverable.id,
          title: deliverable.title,
          status: deliverable.status,
          format: deliverable.format,
          acceptanceCriteria: deliverable.acceptanceCriteria,
        });
      } catch (e) {
        return err(e);
      }
    },
  );

  // ── Collaboration ──

  server.tool(
    'request_clarification',
    'Request clarification on a deliverable from the squad lead or client',
    {
      deliverableId: z.string().uuid().describe('The deliverable needing clarification'),
      question: z.string().describe('The question or clarification needed'),
      urgency: z.enum(['low', 'medium', 'high']).default('medium').describe('How urgent is this clarification'),
    },
    async ({ deliverableId, question, urgency }) => {
      try {
        const message = await apiCall(
          config,
          'POST',
          `/api/contracts/${context.contractId}/messages`,
          {
            content: `❓ [CLARIFICATION${urgency ? ` - ${urgency.toUpperCase()}` : ''}] Re: deliverable ${deliverableId}\n\n${question}`,
            channelType: 'general',
          },
        );
        return ok(message);
      } catch (e) {
        return err(e);
      }
    },
  );

  server.tool(
    'get_team_activity',
    'Get recent activity from all team members on this contract',
    {
      limit: z.number().int().min(1).max(100).default(20).describe('Number of activity entries'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall(
          config,
          'GET',
          `/api/contracts/${context.contractId}/activity?limit=${limit}`,
        );
        return ok(data);
      } catch (e) {
        return err(e);
      }
    },
  );

  // ── Resource: Agent Guidelines ──

  server.resource(
    'guidelines',
    'squadswarm://guidelines',
    async () => ({
      contents: [
        {
          uri: 'squadswarm://guidelines',
          mimeType: 'text/markdown',
          text: `# SquadSwarm Agent Guidelines

## Your Role
You are an AI agent participating in a SquadSwarm contract. You are a first-class team member alongside human collaborators.

## Principles
1. **Transparency**: Always log your work. Other team members should be able to see what you've done.
2. **Attribution**: All your contributions are tracked and attributed. Don't try to obscure your actions.
3. **Collaboration**: Post messages when you have updates, questions, or blockers. Don't work in silence.
4. **Quality**: Follow the acceptance criteria precisely. If criteria are ambiguous, ask for clarification.
5. **Scope**: Only work on deliverables assigned to you. If you see something outside your scope that needs attention, flag it via message.

## Workflow
1. Call \`get_my_tasks\` to see your assigned deliverables
2. Call \`get_acceptance_criteria\` for each task to understand what's expected
3. Call \`update_task_status\` to mark tasks as \`in_progress\`
4. Do your work, uploading files via \`upload_file\` as you go
5. When done, upload the final version with \`isFinal: true\`
6. Post updates to the discussion channel via \`post_message\`
7. Submit a daily log via \`submit_daily_log\`
`,
        },
      ],
    }),
  );

  return server;
}
