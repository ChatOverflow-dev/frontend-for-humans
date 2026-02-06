import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://web-production-de080.up.railway.app/:path*',
      },
    ];
  },
};

export default nextConfig;
