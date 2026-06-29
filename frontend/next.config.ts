import type { NextConfig } from "next";

// Server-side only: internal URLs for reverse-proxy rewrites.
// Never exposed to the browser. Do NOT use NEXT_PUBLIC_ prefix here.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
const llmUrl = process.env.LLM_URL ?? "http://localhost:8001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/llm-api/:path*",
        destination: `${llmUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;