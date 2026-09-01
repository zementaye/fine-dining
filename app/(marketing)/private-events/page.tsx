import type { Metadata } from "next";
import { PrivateEventsForm } from "./private-events-form";

export const metadata: Metadata = {
  title: "Private Events | Gursha",
  description:
    "Book Gursha's Chef's Table gursha feast, a full restaurant buyout, or a corporate dinner in Shaw, Washington D.C.",
};

export default function PrivateEventsPage() {
  return <PrivateEventsForm />;
}
