import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Disable X-Powered-By header
  poweredByHeader: false,

  // Strict React mode
  reactStrictMode: true,

  // Compress responses
  compress: true,

  // Security headers on all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Disable source maps in production
  productionBrowserSourceMaps: false,

  // Environment variables exposed to the browser (non-sensitive only)
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "MicroMart",
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
  },

  // Logging – suppress stack traces in production
  logging: {
    fetches: {
      fullUrl: isDev,
    },
  },

  // Standalone output for Docker deployments
  output: "standalone",

  // Experimental – Server Actions
  experimental: {},
};

export default nextConfig;
