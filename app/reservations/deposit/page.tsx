"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DepositForm } from "@/components/reservations/DepositForm";

function DepositContent() {
  const params = useSearchParams();
  const reservationId = params.get("reservationId")!;
  const code = params.get("code")!;

  return (
    <div className="max-w-xl mx-auto px-8 py-20">
      <p className="divider-mark mb-4 text-xs uppercase tracking-widest2">Gursha</p>
      <h1 className="font-display text-4xl text-center mb-10">Secure Your Table</h1>
      <DepositForm reservationId={reservationId} confirmationCode={code} />
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={null}>
      <DepositContent />
    </Suspense>
  );
}
