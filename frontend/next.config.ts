import type { NextConfig } from "next";

const backendUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const llmUrl =
  process.env.NEXT_PUBLIC_LLM_API_BASE_URL ?? "http://localhost:8001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
      {
        source: "/llm-api/:path*",
        destination: `${llmUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;