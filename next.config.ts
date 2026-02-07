import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://web-production-de080.up.railway.app/:path*',
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
