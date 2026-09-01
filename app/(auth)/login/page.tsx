"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      // Staff go to the floor office; everyone else (guest accounts) go to
      // their reservation history — signing in never dead-ends a guest at
      // /admin, which would just bounce them straight back here.
      const session = await getSession();
      const role = (session?.user as any)?.role;
      router.push(role === "host" || role === "admin" ? "/admin" : "/account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-5">
      <div className="max-w-sm w-full mx-auto py-16">
        <Link href="/" className="block text-center font-display text-3xl text-bone mb-1">
          Gursha
        </Link>
        <h1 className="text-center text-xs uppercase tracking-widest2 text-bone/50 mb-10">
          Sign In
        </h1>

        {justRegistered && (
          <p className="text-sm text-brass text-center mb-6" role="status">
            Account created — sign in below.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-bone/20 px-4 py-3 bg-transparent text-bone placeholder:text-bone/40 focus:outline-none focus:border-brass" />
          <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-bone/20 px-4 py-3 bg-transparent text-bone placeholder:text-bone/40 focus:outline-none focus:border-brass" />
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full bg-brass text-charcoal py-3 tracking-widest2 uppercase text-sm hover:bg-bone transition-colors disabled:opacity-50">
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-bone/40 mt-8">
          Don't have an account?{" "}
          <Link href="/register" className="underline hover:text-bone">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
