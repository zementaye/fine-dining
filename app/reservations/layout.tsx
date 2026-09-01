import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reserve a Table | Gursha",
  description: "Book a table at Gursha, a modern Ethiopian restaurant in Shaw, Washington D.C.",
  // Booking flow pages are transactional, not content — keep them out of search results.
  robots: { index: false, follow: false },
};

export default function ReservationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
