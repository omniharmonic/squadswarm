import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@squadswarm/shared',
    '@squadswarm/db',
    '@squadswarm/ui',
    '@squadswarm/ai',
    '@squadswarm/web3',
  ],
};

export default nextConfig;
