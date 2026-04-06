import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@opentelemetry/api-logs'],
};

export default nextConfig;