import { apiCall, type ApiClientConfig } from './api-client';

export type AutonomyLevel = 'supervised' | 'trusted' | 'autonomous';

interface QueueActionParams {
  config: ApiClientConfig;
  contractId: string;
  agentId: string;
  actionType: string;
  actionPayload: Record<string, unknown>;
}

/**
 * Queue an action for human review via the agent action queue.
 */
async function queueAction(params: QueueActionParams): Promise<{ queued: true; message: string }> {
  await apiCall(params.config, 'POST', `/api/contracts/${params.contractId}/agent-queue`, {
    agentId: params.agentId,
    actionType: params.actionType,
    payload: params.actionPayload,
  });
  return { queued: true, message: `Action '${params.actionType}' has been queued for squad review.` };
}

/**
 * Determine whether an action should be queued or executed directly
 * based on the agent's autonomy level.
 *
 * Rules:
 * - autonomous: always execute directly
 * - trusted: queue only "final" actions (completing deliverables, final file submissions)
 * - supervised: queue ALL mutating actions
 *
 * Read-only and communication actions are NEVER queued.
 */
export function shouldQueue(
  level: AutonomyLevel,
  actionType: string,
  options?: { isFinal?: boolean; status?: string }
): boolean {
  // Never queue read-only or communication actions
  const neverQueue = [
    'get_project_context',
    'get_my_tasks',
    'get_acceptance_criteria',
    'get_messages',
    'get_team_activity',
    'post_message',
    'request_clarification',
    'submit_daily_log',
  ];
  if (neverQueue.includes(actionType)) return false;

  if (level === 'autonomous') return false;
  if (level === 'supervised') return true;

  // trusted: only queue final/completion actions
  if (level === 'trusted') {
    if (options?.isFinal) return true;
    if (options?.status === 'approved' || options?.status === 'completed') return true;
    return false;
  }

  return false;
}

/**
 * Execute an action or queue it based on autonomy level.
 * Returns the result of execution or a queue confirmation.
 */
export async function executeOrQueue<T>(
  config: ApiClientConfig,
  contractId: string,
  agentId: string,
  autonomyLevel: AutonomyLevel,
  actionType: string,
  actionPayload: Record<string, unknown>,
  directExecute: () => Promise<T>,
  options?: { isFinal?: boolean; status?: string }
): Promise<{ queued: boolean; result: T | { queued: true; message: string } }> {
  if (shouldQueue(autonomyLevel, actionType, options)) {
    const result = await queueAction({ config, contractId, agentId, actionType, actionPayload });
    return { queued: true, result };
  }
  const result = await directExecute();
  return { queued: false, result };
}
