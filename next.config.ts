import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/agents/skills.md': [
      './public/agents/**/*',
    ],
    '/demo-api/codex/stream': [
      './node_modules/@openai/codex/**/*',
      './node_modules/@openai/codex-sdk/**/*',
      './node_modules/@openai/codex-linux-x64/**/*',
    ],
    '/demo-api/codex': [
      './node_modules/@openai/codex/**/*',
      './node_modules/@openai/codex-sdk/**/*',
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
