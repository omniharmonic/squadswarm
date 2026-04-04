import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export interface AgentContext {
  agentId: string;
  agentName: string;
  ownerId: string;
  contractId: string;
}

export function createSquadSwarmMcpServer(context: AgentContext) {
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
      // TODO: Call deliverable status API
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              deliverableId,
              newStatus: status,
              note,
              message: `Status updated to ${status}`,
            }),
          },
        ],
      };
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
      // TODO: Update status to blocked + create activity log
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              deliverableId,
              status: 'blocked',
              reason,
            }),
          },
        ],
      };
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
    async ({ deliverableId, fileName, isFinal }) => {
      // TODO: Upload to Supabase Storage + create file record
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              deliverableId,
              fileName,
              isFinal,
              message: isFinal ? 'File uploaded and deliverable submitted for review' : 'File uploaded',
            }),
          },
        ],
      };
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
