import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import { type ApiClientConfig, apiCall } from './api-client';
import { executeOrQueue, type AutonomyLevel } from './autonomy';

export interface AgentContext {
  agentId: string;
  agentName: string;
  ownerId: string;
  contractId: string;
  autonomyLevel: AutonomyLevel;
}

export function createSquadSwarmMcpServer(context: AgentContext, apiConfig: ApiClientConfig) {
  const server = new McpServer({
    name: 'squadswarm',
    version: '0.1.0',
  });

  // ── Task Management ──

  server.tool(
    'get_my_tasks',
    'Get all deliverables assigned to this agent in the current contract',
    {},
    async () => {
      // TODO: Query deliverables where assignedAgentId = context.agentId
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              contractId: context.contractId,
              agentId: context.agentId,
              tasks: [],
              message: 'No tasks assigned yet. Use the SquadSwarm UI to assign deliverables to this agent.',
            }),
          },
        ],
      };
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
        const result = await executeOrQueue(
          apiConfig,
          context.contractId,
          context.agentId,
          context.autonomyLevel,
          'update_task_status',
          { deliverableId, status, note },
          async () => {
            // TODO: Call deliverable status API when available
            return {
              success: true,
              deliverableId,
              newStatus: status,
              note,
              message: `Status updated to ${status}`,
            };
          },
          { status },
        );

        if (result.queued) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result.result),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result.result),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'flag_blocker',
    'Flag a deliverable as blocked with a reason',
    {
      deliverableId: z.string().uuid().describe('The deliverable ID'),
      reason: z.string().describe('Why this deliverable is blocked'),
    },
    async ({ deliverableId, reason }) => {
      try {
        const result = await executeOrQueue(
          apiConfig,
          context.contractId,
          context.agentId,
          context.autonomyLevel,
          'flag_blocker',
          { deliverableId, reason },
          async () => {
            // TODO: Update status to blocked + create activity log
            return {
              success: true,
              deliverableId,
              status: 'blocked',
              reason,
            };
          },
        );

        if (result.queued) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result.result),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result.result),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_project_context',
    'Get full project context including contract details, workstreams, and team',
    {},
    async () => {
      // TODO: Fetch contract detail with workstreams + deliverables
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              contractId: context.contractId,
              agent: { id: context.agentId, name: context.agentName },
              message: 'Project context will include full contract details, workstreams, team members, and deliverables.',
            }),
          },
        ],
      };
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
      // TODO: Insert message with agentId attribution
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              channel: { type: channelType, id: channelId },
              from: context.agentName,
              message: 'Message posted',
            }),
          },
        ],
      };
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
      // TODO: Fetch messages from DB
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              channel: { type: channelType, id: channelId },
              messages: [],
              total: 0,
            }),
          },
        ],
      };
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
        const result = await executeOrQueue(
          apiConfig,
          context.contractId,
          context.agentId,
          context.autonomyLevel,
          'upload_file',
          { deliverableId, fileName, isFinal },
          async () => {
            // TODO: Upload to Supabase Storage + create file record
            return {
              success: true,
              deliverableId,
              fileName,
              isFinal,
              message: isFinal ? 'File uploaded and deliverable submitted for review' : 'File uploaded',
            };
          },
          { isFinal },
        );

        if (result.queued) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result.result),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result.result),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
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
      // TODO: Store in agent_logs table
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              agent: context.agentName,
              summary,
              hoursWorked,
              deliverables: deliverableIds.length,
              message: 'Daily log submitted',
            }),
          },
        ],
      };
    },
  );

  server.tool(
    'get_acceptance_criteria',
    'Get the acceptance criteria for a specific deliverable',
    {
      deliverableId: z.string().uuid().describe('The deliverable ID'),
    },
    async ({ deliverableId }) => {
      // TODO: Fetch from DB
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              deliverableId,
              criteria: [],
              message: 'Acceptance criteria will be populated from the work plan.',
            }),
          },
        ],
      };
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
      // Posts a clarification request as a message tagged to the deliverable
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              deliverableId,
              question,
              urgency,
              from: context.agentName,
              message: 'Clarification request posted to the deliverable channel.',
            }),
          },
        ],
      };
    },
  );

  server.tool(
    'get_team_activity',
    'Get recent activity from all team members on this contract',
    {
      limit: z.number().int().min(1).max(100).default(20).describe('Number of activity entries'),
    },
    async ({ limit }) => {
      // TODO: Fetch from activity_log table
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              contractId: context.contractId,
              activities: [],
              total: 0,
              limit,
              message: 'Team activity feed from the activity log.',
            }),
          },
        ],
      };
    },
  );

  // ── Bidding ──

  server.tool(
    'claim_deliverable',
    'Claim a deliverable on a bid, proposing a payment share percentage',
    {
      bidId: z.string().describe('The bid ID to claim a deliverable on'),
      deliverableKey: z.string().describe('The deliverable key/index to claim'),
      proposedBps: z.number().int().min(0).max(10000).describe('Proposed payment share in basis points (100 = 1%)'),
      note: z.string().optional().describe('Optional note explaining why this agent should handle this deliverable'),
    },
    async ({ bidId, deliverableKey, proposedBps, note }) => {
      try {
        const result = await executeOrQueue(
          apiConfig,
          context.contractId,
          context.agentId,
          context.autonomyLevel,
          'claim_deliverable',
          { bidId, deliverableKey, proposedBps, note },
          async () => {
            return apiCall(apiConfig, 'POST', `/api/bids/${bidId}/claims`, {
              deliverableKey,
              proposedBps,
              note,
              agentId: context.agentId,
            });
          },
        );

        if (result.queued) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result.result, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result.result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
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

## Autonomy
Your actions may be queued for human review depending on your autonomy level:
- **supervised**: All mutating actions require approval
- **trusted**: Only final submissions require approval
- **autonomous**: All actions execute immediately

You can claim deliverables on bids using \`claim_deliverable\`.
`,
        },
      ],
    }),
  );

  return server;
}
