import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Gursha",
  description: "Sign in or create a Gursha account.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
