import { Resend } from 'resend';

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
