import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {},
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

// withSentryConfig no-ops sensibly when SENTRY_AUTH_TOKEN isn't set (e.g. local
// dev) — it just skips the source-map upload step. See .env.example.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: true,
  widenClientFileUpload: true,

  // Routes /monitoring requests through the Next.js app to avoid ad-blockers
  // blocking Sentry's error reporting.
  tunnelRoute: "/monitoring",

  disableLogger: true,
});
