import { describe, it, expect } from 'vitest';
import { shouldQueue } from './autonomy';

describe('shouldQueue — agent autonomy gating', () => {
  const readOnly = [
    'get_project_context',
    'get_my_tasks',
    'get_acceptance_criteria',
    'get_messages',
    'post_message',
    'request_clarification',
    'submit_daily_log',
  ];

  it('never queues read-only / communication actions regardless of level', () => {
    for (const level of ['supervised', 'trusted', 'autonomous'] as const) {
      for (const action of readOnly) {
        expect(shouldQueue(level, action)).toBe(false);
      }
    }
  });

  it('autonomous never queues, even mutating/final actions', () => {
    expect(shouldQueue('autonomous', 'update_task_status', { status: 'approved' })).toBe(false);
    expect(shouldQueue('autonomous', 'upload_file', { isFinal: true })).toBe(false);
  });

  it('supervised queues every mutating action', () => {
    expect(shouldQueue('supervised', 'update_task_status')).toBe(true);
    expect(shouldQueue('supervised', 'upload_file', { isFinal: false })).toBe(true);
    expect(shouldQueue('supervised', 'claim_deliverable')).toBe(true);
  });

  it('trusted queues only final/completion actions', () => {
    expect(shouldQueue('trusted', 'upload_file', { isFinal: false })).toBe(false);
    expect(shouldQueue('trusted', 'upload_file', { isFinal: true })).toBe(true);
    expect(shouldQueue('trusted', 'update_task_status', { status: 'approved' })).toBe(true);
    expect(shouldQueue('trusted', 'update_task_status', { status: 'completed' })).toBe(true);
    expect(shouldQueue('trusted', 'update_task_status', { status: 'in_progress' })).toBe(false);
  });
});
