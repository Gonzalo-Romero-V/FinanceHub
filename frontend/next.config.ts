import type { NextConfig } from "next";

// Server-side only: internal URLs for reverse-proxy rewrites.
// Never exposed to the browser. Do NOT use NEXT_PUBLIC_ prefix here.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
const llmUrl = process.env.LLM_URL ?? "http://localhost:8001";

// BUILD_TARGET=mobile → export estático para empaquetar en Capacitor (sin
// servidor Next.js corriendo en el dispositivo, así que no hay rewrites: la
// app llama directo a las URLs absolutas de producción, ver
// NEXT_PUBLIC_API_URL/NEXT_PUBLIC_LLM_API_BASE_URL en .env.mobile).
// Cualquier otro valor (o ausente) → build web normal con rewrites
// server-side, sin cambios de comportamiento respecto a como estaba.
const isMobileBuild = process.env.BUILD_TARGET === "mobile";

const nextConfig: NextConfig = isMobileBuild
  ? {
      output: "export",
      // La Image Optimization API de Next.js requiere un servidor; no existe
      // en un export estático empaquetado en el APK.
      images: { unoptimized: true },
    }
  : {
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
