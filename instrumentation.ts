// Next.js calls register() once per server runtime on boot, and onRequestError
// for any error thrown out of a Server Component, Route Handler, or Server
// Action (App Router). This is the piece that gives Sentry visibility into
// route-handler errors without hand-adding captureException to every catch
// block — though a few endpoints that swallow-and-log their own errors
// (webhook, deposit, claim) still get an explicit captureException, since
// they never rethrow.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = async (...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>) => {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
