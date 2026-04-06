import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@opentelemetry/api-logs', 'loglevel'],
};

export default nextConfig;