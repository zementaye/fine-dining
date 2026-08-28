"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleCancel() {
    const res = await fetch(`/api/reservations/${reservationId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === "cancellation_window_passed") {
        setMessage(data.message);
      } else {
        setMessage(data.error ?? "Could not cancel.");
      }
      return;
    }
    router.refresh();
  }

  if (message) return <p className="text-sm text-red-700">{message}</p>;

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn-outline">
        Cancel Reservation
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm">Are you sure?</span>
      <button onClick={handleCancel} className="text-sm underline">Yes, cancel</button>
      <button onClick={() => setConfirming(false)} className="text-sm underline">No</button>
    </div>
  );
}
