/**
 * Centralized, validated access to security-critical secrets.
 *
 * In production we refuse to boot with a missing or weak secret — a silent
 * fallback to a hardcoded default is the difference between "signed sessions"
 * and "anyone can mint a session". Outside production we allow a clearly
 * labelled development fallback so local/test runs don't require setup.
 */

const MIN_SECRET_LENGTH = 32;
const DEV_FALLBACK = 'dev-only-insecure-secret-do-not-use-in-production';

function requireSecret(name: string, value: string | undefined, fallback?: string): string {
  if (value && value.length >= MIN_SECRET_LENGTH) return value;

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new Error(
      `${name} is not set or is shorter than ${MIN_SECRET_LENGTH} characters. ` +
        `Refusing to start in production with a missing/weak secret.`,
    );
  }

  if (value && value.length < MIN_SECRET_LENGTH) {
    // Non-prod but explicitly set too short — warn but allow.
    console.warn(`[env] ${name} is shorter than ${MIN_SECRET_LENGTH} chars; using it anyway (non-production).`);
    return value;
  }

  return fallback ?? DEV_FALLBACK;
}

let _jwtSecret: Uint8Array | null = null;
export function getJwtSecret(): Uint8Array {
  if (!_jwtSecret) {
    _jwtSecret = new TextEncoder().encode(requireSecret('JWT_SECRET', process.env.JWT_SECRET));
  }
  return _jwtSecret;
}

let _agentSecret: Uint8Array | null = null;
export function getAgentSecret(): Uint8Array {
  if (!_agentSecret) {
    // Agent tokens may use a dedicated secret; otherwise they share JWT_SECRET.
    const raw = process.env.AGENT_TOKEN_SECRET || process.env.JWT_SECRET;
    _agentSecret = new TextEncoder().encode(requireSecret('AGENT_TOKEN_SECRET/JWT_SECRET', raw));
  }
  return _agentSecret;
}
