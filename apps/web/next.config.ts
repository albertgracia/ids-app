import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/core/:path*",
        destination: `${process.env.IDS_CORE_BASE_URL || "http://ids-core:8088"}/:path*`,
      },
      {
        source: "/api/analytics/:path*",
        destination: `${process.env.IDS_ANALYTICS_BASE_URL || "http://ids-analytics:8090"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
