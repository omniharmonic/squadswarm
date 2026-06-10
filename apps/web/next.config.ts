import type { NextConfig } from 'next';
import path from 'path';

// Baseline security headers applied to every response. Kept intentionally
// conservative (no rigid CSP that would break wallet SDKs/inline styles yet);
// tighten the CSP once the asset/script origins are enumerated.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@squadswarm/shared',
    '@squadswarm/db',
    '@squadswarm/ui',
    '@squadswarm/ai',
    '@squadswarm/web3',
  ],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
