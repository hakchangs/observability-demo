import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'standalone',
  serverExternalPackages: ['@opentelemetry/api-logs', 'loglevel', '@opentelemetry/api'],
};

export default nextConfig;