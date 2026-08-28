"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Shown when a guest lands back from Stripe's redirect flow (redirect_status
 * param present) but the reservation is still `pending` — the webhook that
 * flips it to `confirmed` may take a few seconds to arrive. Polls by
 * refreshing the server component every 2s, up to 15s, rather than leaving
 * the guest looking at a stale "pending" status after they've already paid.
 */
export function PaymentPendingBanner({ status }: { status: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [attempts, setAttempts] = useState(0);

  const cameFromStripe = params.get("redirect_status") === "succeeded";

  useEffect(() => {
    if (!cameFromStripe || status !== "pending" || attempts >= 7) return;
    const t = setTimeout(() => {
      setAttempts((a) => a + 1);
      router.refresh();
    }, 2000);
    return () => clearTimeout(t);
  }, [cameFromStripe, status, attempts, router]);

  if (!cameFromStripe || status !== "pending") return null;

  return (
    <div className="border border-brass bg-brass/10 px-4 py-3 mb-6 text-sm">
      Payment received — confirming your reservation now. This page will update
      automatically in a few seconds.
    </div>
  );
}
