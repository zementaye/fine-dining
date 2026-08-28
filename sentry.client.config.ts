// This file configures the initialization of Sentry on the client (browser).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // Keep this modest — this is a small booking site, not a high-traffic app.
  // Bump if error volume/cost justifies more sampling.
  tracesSampleRate: 0.2,

  // Session Replay: capture almost nothing on happy paths, everything when
  // an error actually occurs, so we get repro context without the storage
  // cost of recording every session in full.
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.replayIntegration()],

  // No-op (rather than throwing) when DSN isn't set, e.g. local dev without
  // Sentry configured — see NEXT_PUBLIC_SENTRY_DSN in .env.example.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
