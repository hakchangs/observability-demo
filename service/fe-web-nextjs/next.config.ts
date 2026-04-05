import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
i  output: 'standalone',
  async rewrites() {
    const bffUrl = process.env.BFF_URL ?? 'http://localhost:8880';
    const otelUrl = process.env.OTEL_COLLECTOR_URL ?? 'http://localhost:4318';
    return [
      {
        source: '/api/:path*',
        destination: `${bffUrl}/api/:path*`,
      },
      {
        source: '/v1/:path*',
        destination: `${otelUrl}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
