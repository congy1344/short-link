import type { NextConfig } from "next";

const apiOrigin = process.env.API_INTERNAL_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${apiOrigin}/:path*`
        }
      ],
      afterFiles: [
        {
          source: "/:code([A-Za-z0-9_-]{3,32})",
          destination: `${apiOrigin}/:code`
        }
      ]
    };
  }
};

export default nextConfig;
