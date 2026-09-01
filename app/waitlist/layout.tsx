import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Table Offer | Gursha",
  robots: { index: false, follow: false },
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
