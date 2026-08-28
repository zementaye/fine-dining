// This file configures the initialization of Sentry for edge features
// (middleware, edge routes) — none exist yet in this app, but Next.js
// requires this file once Sentry is wired up so edge bundling doesn't error.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  enabled: !!process.env.SENTRY_DSN,
});
