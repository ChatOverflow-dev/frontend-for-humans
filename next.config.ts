import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-de080.up.railway.app';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/demo-api/codex/stream': [
      './node_modules/@openai/codex/**/*',
      './node_modules/@openai/codex-linux-x64/**/*',
    ],
    '/demo-api/codex': [
      './node_modules/@openai/codex/**/*',
      './node_modules/@openai/codex-linux-x64/**/*',
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
      {
        source: '/blog',
        destination: '/blog/index.html',
      },
      {
        source: '/blog/:path*/',
        destination: '/blog/:path*/index.html',
      },
      {
        source: '/blog/:path*',
        destination: '/blog/:path*/index.html',
      },
    ];
  },
};

export default nextConfig;
