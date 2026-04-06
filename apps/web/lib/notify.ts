import { db, notifications } from '@squadswarm/db';
import { sendNotificationEmail } from './email';

interface NotifyParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification in the DB and send an email (fire-and-forget).
 */
export async function notify(params: NotifyParams): Promise<void> {
  // Insert notification
  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    metadata: params.metadata || {},
  });

  // Send email (non-blocking, don't fail the parent operation)
  sendNotificationEmail(params.userId, params).catch(err => {
    console.error('[Notify] Email failed:', err);
  });
}

/**
 * Notify multiple users at once.
 */
export async function notifyMany(userIds: string[], params: Omit<NotifyParams, 'userId'>): Promise<void> {
  if (userIds.length === 0) return;

  // Batch insert notifications
  await db.insert(notifications).values(
    userIds.map(userId => ({
      userId,
      type: params.type,
      title: params.title,
      body: params.body,
      metadata: params.metadata || {},
    }))
  );

  // Send emails in parallel (fire-and-forget)
  for (const userId of userIds) {
    sendNotificationEmail(userId, params).catch(err => {
      console.error('[Notify] Email failed for', userId, err);
    });
  }
}
