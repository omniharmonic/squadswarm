export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function GET() {
  await clearSessionCookie();
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ message: 'Logged out' });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ message: 'Logged out' });
}
