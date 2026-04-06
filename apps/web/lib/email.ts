import { Resend } from 'resend';
import { eq } from 'drizzle-orm';
import { db, users } from '@squadswarm/db';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendMagicLink(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const magicLinkUrl = `${baseUrl}/verify?token=${token}`;

  const { data, error } = await getResend().emails.send({
    from: 'SquadSwarm <hello@squadswarm.xyz>',
    to: email,
    subject: 'Sign in to SquadSwarm',
    html: `
      <div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 48px 24px; background: #FAFAF8;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 24px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.5px;">SquadSwarm</div>
        </div>
        <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #E5E3DF;">
          <h1 style="color: #1A1A1A; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">Sign in to SquadSwarm</h1>
          <p style="color: #64635F; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
            Click the button below to sign in. This link expires in 15 minutes.
          </p>
          <a href="${magicLinkUrl}"
             style="display: inline-block; background: #bb6b44; color: white; text-decoration: none;
                    padding: 14px 36px; border-radius: 12px; font-weight: 600; font-size: 15px;">
            Sign in to SquadSwarm
          </a>
        </div>
        <p style="color: #9C9A95; font-size: 13px; margin-top: 24px; text-align: center;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log('Email sent:', data?.id);
}

export async function sendNotificationEmail(
  userId: string,
  notification: { type: string; title: string; body: string; metadata?: Record<string, unknown> }
): Promise<void> {
  // Look up user email
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.email) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.squadswarm.xyz';

  // Build CTA link based on notification metadata
  let ctaUrl = `${baseUrl}/dashboard`;
  let ctaText = 'View Dashboard';
  const meta = notification.metadata || {};
  if (meta.bidId) { ctaUrl = `${baseUrl}/bids/${meta.bidId}/collaborate`; ctaText = 'View Bid'; }
  if (meta.contractId) { ctaUrl = `${baseUrl}/contracts/${meta.contractId}`; ctaText = 'View Contract'; }
  if (meta.scopeId) { ctaUrl = `${baseUrl}/scopes/${meta.scopeId}`; ctaText = 'View Scope'; }

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: 'SquadSwarm <notifications@squadswarm.xyz>',
    to: user.email,
    subject: notification.title,
    html: `
      <div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${baseUrl}/logo-64.png" width="40" height="40" alt="SquadSwarm" />
        </div>
        <h2 style="color: #1A1A1A; font-size: 18px; margin-bottom: 8px;">${notification.title}</h2>
        <p style="color: #64635F; font-size: 14px; line-height: 1.6;">${notification.body}</p>
        <div style="margin-top: 24px;">
          <a href="${ctaUrl}" style="display: inline-block; background: #bb6b44; color: white; padding: 10px 24px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 500;">${ctaText}</a>
        </div>
        <p style="color: #9C9A95; font-size: 12px; margin-top: 32px; border-top: 1px solid #E5E3DF; padding-top: 16px;">
          SquadSwarm &mdash; Cooperative Work Brokerage
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('[Notify] Resend error:', error);
  }
}
