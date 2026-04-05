import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// ── Types ──

export interface AgentContext {
  agentId: string;
  agentName: string;
  ownerId: string;
  contractId: string;
  apiBaseUrl: string;
  apiToken: string;
  autonomyLevel: 'supervised' | 'trusted' | 'autonomous';
}

// ── API Helper ──

async function apiCall(
  context: AgentContext,
  path: string,
  options?: RequestInit
): Promise<unknown> {
  const url = `${context.apiBaseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.apiToken}`,
      'X-Agent-Id': context.agentId,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      `API ${res.status}: ${(error as Record<string, string>).error || res.statusText}`
    );
  }
  return res.json();
}

/** Wrap a tool handler so errors are returned as MCP text content, not thrown. */
function mcpResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function mcpError(message: string) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

// ── Server Factory ──

export function createSquadSwarmMcpServer(context: AgentContext) {
  const server = new McpServer({
    name: 'squadswarm',
    version: '0.2.0',
  });

  // ─────────────────────────────────────────────
  // Phase 1: Read-Only Context
  // ─────────────────────────────────────────────

  server.tool(
    'get_project_context',
    'Get full project context including contract details, workstreams, deliverables, and team members',
    {},
    async () => {
      try {
        // Fetch both contract detail and board data in parallel
        const [contractDetail, board] = await Promise.all([
          apiCall(context, `/api/contracts/${context.contractId}`),
          apiCall(context, `/api/contracts/${context.contractId}/deliverables`),
        ]);

        return mcpResult({
          contract: contractDetail,
          board: board,
          agent: {
            id: context.agentId,
            name: context.agentName,
            autonomyLevel: context.autonomyLevel,
          },
        });
      } catch (err) {
        return mcpError(`Failed to get project context: ${(err as Error).message}`);
      }
    }
  );

  server.tool(
    'get_my_tasks',
    'Get all deliverables assigned to this agent in the current contract',
    {},
    async () => {
      try {
        // Fetch the board (workstreams with deliverables) and filter to this agent
        const board = (await apiCall(
          context,
          `/api/contracts/${context.contractId}/deliverables`
        )) as Array<{
          id: string;
          title: string;
          deliverables: Array<{
            id: string;
            assignedAgentId: string | null;
            [key: string]: unknown;
          }>;
          [key: string]: unknown;
        }>;

        const myTasks: Array<{
          workstream: { id: string; title: string };
          deliverable: Record<string, unknown>;
        }> = [];

        for (const ws of board) {
          for (const del of ws.deliverables || []) {
            if (del.assignedAgentId === context.agentId) {
              myTasks.push({
                workstream: { id: ws.id, title: ws.title },
                deliverable: del,
              });
            }
          }
        }

        return mcpResult({
          contractId: context.contractId,
          agentId: context.agentId,
          agentName: context.agentName,
          taskCount: myTasks.length,
          tasks: myTasks,
        });
      } catch (err) {
        return mcpError(`Failed to get tasks: ${(err as Error).message}`);
      }
    }
  );

  server.tool(
    'get_acceptance_criteria',
    'Get the acceptance criteria for a specific deliverable',
    {
      deliverableId: z.string().uuid().describe('The deliverable ID'),
    },
    async ({ deliverableId }) => {
      try {
        // Fetch from the board and find the specific deliverable
        const board = (await apiCall(
          context,
          `/api/contracts/${context.contractId}/deliverables`
        )) as Array<{
          deliverables: Array<{
            id: string;
            title: string;
            description: string | null;
            format: string;
            acceptanceCriteria: unknown;
            dueDate: string | null;
            estimatedEffortHours: number | null;
            [key: string]: unknown;
          }>;
        }>;

        let found: Record<string, unknown> | null = null;
        for (const ws of board) {
          for (const del of ws.deliverables || []) {
            if (del.id === deliverableId) {
              found = {
                deliverableId: del.id,
                title: del.title,
                description: del.description,
                format: del.format,
                acceptanceCriteria: del.acceptanceCriteria || [],
                dueDate: del.dueDate,
                estimatedEffortHours: del.estimatedEffortHours,
              };
              break;
            }
          }
          if (found) break;
        }

        if (!found) {
          return mcpError(`Deliverable ${deliverableId} not found in this contract`);
        }

        return mcpResult(found);
      } catch (err) {
        return mcpError(
          `Failed to get acceptance criteria: ${(err as Error).message}`
        );
      }
    }
  );

  server.tool(
    'get_messages',
    'Get recent messages from a contract discussion channel',
    {
      channelType: z
        .enum(['general', 'workstream', 'deliverable'])
        .describe('Channel type'),
      channelId: z
        .string()
        .optional()
        .describe('Channel ID (workstream or deliverable ID)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .describe('Number of messages to return'),
    },
    async ({ channelType, channelId, limit }) => {
      try {
        const params = new URLSearchParams();
        params.set('channelType', channelType);
        if (channelId) params.set('channelId', channelId);
        params.set('limit', String(limit));

        const data = await apiCall(
          context,
          `/api/contracts/${context.contractId}/messages?${params.toString()}`
        );

        return mcpResult(data);
      } catch (err) {
        return mcpError(`Failed to get messages: ${(err as Error).message}`);
      }
    }
  );

  // ─────────────────────────────────────────────
  // Phase 2: Communication
  // ─────────────────────────────────────────────

  server.tool(
    'post_message',
    'Post a message to a contract discussion channel. Always allowed at all autonomy levels.',
    {
      channelType: z
        .enum(['general', 'workstream', 'deliverable'])
        .describe('Channel type'),
      channelId: z
        .string()
        .optional()
        .describe('Channel ID (workstream or deliverable ID)'),
      content: z.string().describe('Message content (markdown supported)'),
    },
    async ({ channelType, channelId, content: msgContent }) => {
      try {
        const data = await apiCall(
          context,
          `/api/contracts/${context.contractId}/messages`,
          {
            method: 'POST',
            body: JSON.stringify({
              channelType,
              channelId: channelId || null,
              content: msgContent,
              mentions: [],
            }),
          }
        );

        return mcpResult({
          success: true,
          message: data,
          from: context.agentName,
        });
      } catch (err) {
        return mcpError(`Failed to post message: ${(err as Error).message}`);
      }
    }
  );

  server.tool(
    'flag_blocker',
    'Flag a deliverable as blocked with a reason. Also posts an explanatory message to the deliverable channel. Always allowed.',
    {
      deliverableId: z.string().uuid().describe('The deliverable ID'),
      reason: z.string().describe('Why this deliverable is blocked'),
    },
    async ({ deliverableId, reason }) => {
      try {
        // Update status to blocked
        const updated = await apiCall(
          context,
          `/api/deliverables/${deliverableId}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status: 'blocked', note: reason }),
          }
        );

        // Also post a message explaining the blocker
        try {
          await apiCall(
            context,
            `/api/contracts/${context.contractId}/messages`,
            {
              method: 'POST',
              body: JSON.stringify({
                channelType: 'deliverable',
                channelId: deliverableId,
                content: `**Blocker Flagged** by ${context.agentName}:\n\n${reason}`,
                mentions: [],
              }),
            }
          );
        } catch {
          // Non-fatal: status was updated even if message failed
        }

        return mcpResult({
          success: true,
          deliverableId,
          status: 'blocked',
          reason,
          deliverable: updated,
        });
      } catch (err) {
        return mcpError(`Failed to flag blocker: ${(err as Error).message}`);
      }
    }
  );

  // ─────────────────────────────────────────────
  // Phase 3: Work Submission
  // ─────────────────────────────────────────────

  server.tool(
    'update_task_status',
    'Update the status of an assigned deliverable. For "in_review" with supervised autonomy, the action is queued for human approval.',
    {
      deliverableId: z.string().uuid().describe('The deliverable ID'),
      status: z
        .enum(['in_progress', 'in_review', 'blocked'])
        .describe('New status'),
      note: z
        .string()
        .optional()
        .describe('Optional note about the status change'),
    },
    async ({ deliverableId, status, note }) => {
      try {
        // For 'in_review' with supervised autonomy, queue the action
        if (status === 'in_review' && context.autonomyLevel === 'supervised') {
          const queueResult = await apiCall(
            context,
            `/api/contracts/${context.contractId}/agent-queue`,
            {
              method: 'POST',
              body: JSON.stringify({
                actionType: 'submit_deliverable',
                deliverableId,
                note,
                agentId: context.agentId,
              }),
            }
          );

          return mcpResult({
            success: true,
            deliverableId,
            requestedStatus: status,
            actualStatus: 'pending_human_review',
            message:
              'Your autonomy level is "supervised". This status change has been queued for human approval.',
            queueEntry: queueResult,
          });
        }

        // For in_progress and blocked, or trusted/autonomous in_review: apply directly
        const updated = await apiCall(
          context,
          `/api/deliverables/${deliverableId}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status, note }),
          }
        );

        return mcpResult({
          success: true,
          deliverableId,
          newStatus: status,
          note,
          deliverable: updated,
        });
      } catch (err) {
        return mcpError(
          `Failed to update task status: ${(err as Error).message}`
        );
      }
    }
  );

  server.tool(
    'upload_file',
    'Upload a file as a deliverable attachment. For final submissions with supervised autonomy, the action is queued for human approval.',
    {
      deliverableId: z
        .string()
        .uuid()
        .describe('The deliverable to attach the file to'),
      fileName: z.string().describe('File name'),
      content: z
        .string()
        .describe(
          'File content (base64 encoded for binary, plain text for text files)'
        ),
      isFinal: z
        .boolean()
        .default(false)
        .describe(
          'Mark as final submission (moves deliverable to in_review if allowed)'
        ),
    },
    async ({ deliverableId, fileName, content: fileContent, isFinal }) => {
      try {
        // Upload the file via the contract files endpoint
        const fileData = await apiCall(
          context,
          `/api/contracts/${context.contractId}/files/agent-upload`,
          {
            method: 'POST',
            body: JSON.stringify({
              deliverableId,
              fileName,
              content: fileContent,
              agentId: context.agentId,
              isFinal,
            }),
          }
        );

        // Handle final submission logic
        if (isFinal) {
          if (context.autonomyLevel === 'supervised') {
            // Queue the final submission for human review
            try {
              await apiCall(
                context,
                `/api/contracts/${context.contractId}/agent-queue`,
                {
                  method: 'POST',
                  body: JSON.stringify({
                    actionType: 'upload_final_file',
                    deliverableId,
                    fileName,
                    agentId: context.agentId,
                  }),
                }
              );
            } catch {
              // Non-fatal
            }

            return mcpResult({
              success: true,
              deliverableId,
              fileName,
              isFinal: true,
              status: 'pending_human_review',
              message:
                'File uploaded. Since your autonomy level is "supervised", the final submission is queued for human approval before the deliverable moves to in_review.',
              file: fileData,
            });
          }

          // Trusted/autonomous: also move deliverable to in_review
          try {
            await apiCall(
              context,
              `/api/deliverables/${deliverableId}/status`,
              {
                method: 'PATCH',
                body: JSON.stringify({ status: 'in_review' }),
              }
            );
          } catch {
            // Non-fatal: file was uploaded even if status update failed
          }

          return mcpResult({
            success: true,
            deliverableId,
            fileName,
            isFinal: true,
            status: 'in_review',
            message:
              'File uploaded as final submission. Deliverable moved to in_review.',
            file: fileData,
          });
        }

        return mcpResult({
          success: true,
          deliverableId,
          fileName,
          isFinal: false,
          message: 'File uploaded successfully.',
          file: fileData,
        });
      } catch (err) {
        return mcpError(`Failed to upload file: ${(err as Error).message}`);
      }
    }
  );

  server.tool(
    'submit_daily_log',
    'Submit a daily activity log summarizing work completed. Always allowed.',
    {
      summary: z.string().describe('Summary of work done today'),
      hoursWorked: z.number().min(0).max(24).describe('Hours worked'),
      deliverableIds: z
        .array(z.string().uuid())
        .describe('Deliverables worked on'),
    },
    async ({ summary, hoursWorked, deliverableIds }) => {
      try {
        const data = await apiCall(
          context,
          `/api/contracts/${context.contractId}/activity`,
          {
            method: 'POST',
            body: JSON.stringify({
              action: 'daily_log_submitted',
              entityType: 'contract',
              entityId: context.contractId,
              metadata: {
                summary,
                hoursWorked,
                deliverableIds,
                byAgent: true,
              },
            }),
          }
        );

        return mcpResult({
          success: true,
          agent: context.agentName,
          summary,
          hoursWorked,
          deliverables: deliverableIds.length,
          activityEntry: data,
        });
      } catch (err) {
        return mcpError(
          `Failed to submit daily log: ${(err as Error).message}`
        );
      }
    }
  );

  // ─────────────────────────────────────────────
  // Phase 4: Advanced Tools
  // ─────────────────────────────────────────────

  server.tool(
    'request_clarification',
    'Request clarification on a deliverable by posting a tagged message. Creates a notification for the squad lead. Always allowed.',
    {
      deliverableId: z.string().uuid().describe('The deliverable ID'),
      question: z
        .string()
        .describe('The clarification question to ask'),
    },
    async ({ deliverableId, question }) => {
      try {
        const messageContent = `[Clarification Request] from **${context.agentName}**:\n\n${question}`;

        const data = await apiCall(
          context,
          `/api/contracts/${context.contractId}/messages`,
          {
            method: 'POST',
            body: JSON.stringify({
              channelType: 'deliverable',
              channelId: deliverableId,
              content: messageContent,
              mentions: [],
            }),
          }
        );

        return mcpResult({
          success: true,
          deliverableId,
          question,
          message: data,
          note: 'Clarification request posted to the deliverable channel.',
        });
      } catch (err) {
        return mcpError(
          `Failed to request clarification: ${(err as Error).message}`
        );
      }
    }
  );

  server.tool(
    'get_team_activity',
    'Get recent activity from all team members in the contract. Helps understand what has been happening.',
    {
      since: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp to get activity since (e.g. "2024-01-01T00:00:00Z")'
        ),
    },
    async ({ since }) => {
      try {
        const params = new URLSearchParams();
        if (since) params.set('since', since);

        const queryString = params.toString();
        const path = `/api/contracts/${context.contractId}/activity${queryString ? `?${queryString}` : ''}`;

        const data = await apiCall(context, path);

        return mcpResult({
          contractId: context.contractId,
          since: since || 'all time',
          activity: data,
        });
      } catch (err) {
        return mcpError(
          `Failed to get team activity: ${(err as Error).message}`
        );
      }
    }
  );

  // ─────────────────────────────────────────────
  // Resource: Agent Guidelines
  // ─────────────────────────────────────────────

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

## Your Identity
- Agent ID: ${context.agentId}
- Agent Name: ${context.agentName}
- Contract ID: ${context.contractId}
- Autonomy Level: ${context.autonomyLevel}

## Autonomy Levels
- **supervised**: Status changes to "in_review" and final file submissions are queued for human approval before taking effect.
- **trusted**: You can submit work directly, but humans review the results.
- **autonomous**: Full autonomy to manage your deliverables.

Your current level is **${context.autonomyLevel}**.

## Principles
1. **Transparency**: Always log your work. Other team members should be able to see what you've done.
2. **Attribution**: All your contributions are tracked and attributed. Don't try to obscure your actions.
3. **Collaboration**: Post messages when you have updates, questions, or blockers. Don't work in silence.
4. **Quality**: Follow the acceptance criteria precisely. If criteria are ambiguous, use \`request_clarification\`.
5. **Scope**: Only work on deliverables assigned to you. If you see something outside your scope that needs attention, flag it via message.

## Workflow
1. Call \`get_project_context\` to understand the full project scope and team
2. Call \`get_my_tasks\` to see your assigned deliverables
3. Call \`get_acceptance_criteria\` for each task to understand what's expected
4. Call \`update_task_status\` to mark tasks as \`in_progress\`
5. Do your work, uploading files via \`upload_file\` as you go
6. If stuck, use \`request_clarification\` or \`flag_blocker\`
7. When done, upload the final version with \`isFinal: true\`
8. Post updates to the discussion channel via \`post_message\`
9. Submit a daily log via \`submit_daily_log\`
10. Use \`get_team_activity\` to stay aware of what others are doing

## Human-in-the-Loop System
${context.autonomyLevel === 'supervised' ? `Because your autonomy level is "supervised", certain actions require human approval:
- Moving a deliverable to "in_review" status
- Uploading a final submission file
These actions will be queued and a human reviewer will approve or reject them.
All other actions (messaging, status changes to in_progress/blocked, non-final uploads) proceed immediately.` : `Your autonomy level allows you to submit work directly. Humans will review the delivered results.`}
`,
        },
      ],
    })
  );

  return server;
}
