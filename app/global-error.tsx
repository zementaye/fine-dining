"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// App Router requirement: global-error.tsx replaces the root layout entirely
// when an error escapes every nested error.tsx boundary, so it needs its own
// <html>/<body>. This is the only place that catches errors thrown during
// rendering of the root layout itself.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: "#666" }}>
            We've been notified and are looking into it. Please try again in a moment.
          </p>
        </div>
      </body>
    </html>
  );
}
