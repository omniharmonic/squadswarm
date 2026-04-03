import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendMagicLink(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const magicLinkUrl = `${baseUrl}/verify?token=${token}`;

  const { data, error } = await getResend().emails.send({
    from: 'SquadSwarm <noreply@cosense.us>',
    to: email,
    subject: 'Sign in to SquadSwarm',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #2C2825; font-size: 24px; margin-bottom: 16px;">Sign in to SquadSwarm</h1>
        <p style="color: #6B6560; font-size: 16px; line-height: 1.5; margin-bottom: 32px;">
          Click the button below to sign in. This link expires in 15 minutes.
        </p>
        <a href="${magicLinkUrl}"
           style="display: inline-block; background: #C4553A; color: white; text-decoration: none;
                  padding: 12px 32px; border-radius: 8px; font-weight: 500; font-size: 16px;">
          Sign in to SquadSwarm
        </a>
        <p style="color: #9A9590; font-size: 14px; margin-top: 32px;">
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
