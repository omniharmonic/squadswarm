import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { getAgentSecret } from './env';

export interface AgentSession {
  agentId: string;
  contractId: string;
  ownerId: string;
  autonomyLevel: 'supervised' | 'trusted' | 'autonomous';
}

export async function createAgentToken(payload: AgentSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getAgentSecret());
}

export async function getAgentSession(req: NextRequest): Promise<AgentSession | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, getAgentSecret());
    if (!payload.agentId || !payload.contractId || !payload.ownerId) return null;
    return {
      agentId: payload.agentId as string,
      contractId: payload.contractId as string,
      ownerId: payload.ownerId as string,
      autonomyLevel: (payload.autonomyLevel as AgentSession['autonomyLevel']) || 'supervised',
    };
  } catch {
    return null;
  }
}
