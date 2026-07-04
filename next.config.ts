import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Allow images from external sources (brand logos, product images, etc.)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.githubusercontent.com" },
      { protocol: "https", hostname: "liqpay.com" },
    ],
  },

  // Server-side runtime configuration
  serverRuntimeConfig: {
    // These are only available server-side
    databaseUrl: process.env.DATABASE_URL,
  },

  // Public runtime configuration (exposed to client)
  publicRuntimeConfig: {
    // Empty — use NEXT_PUBLIC_ prefix for client-side vars
  },

  // Experimental features for production readiness
  experimental: {
    // Enable optimized production builds
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
};

export default nextConfig;