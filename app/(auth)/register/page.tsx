"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Optional guest account registration (per spec: "guest accounts optional").
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) router.push("/login?registered=1");
      else setError("Could not create account — that email may already be registered.");
    } catch {
      setError("Could not reach the server — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-5 sm:px-8 py-24">
      <Link href="/" className="block text-center font-display text-2xl mb-1">
        Gursha
      </Link>
      <h1 className="text-center text-xs uppercase tracking-widest2 text-charcoal/50 mb-10">
        Create Account
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required placeholder="Name" className="field"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" placeholder="Email" className="field"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" placeholder="Password" minLength={8} className="field"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creating…" : "Create Account"}
        </button>
      </form>
      <p className="text-center text-xs text-charcoal/40 mt-8">
        Already have an account?{" "}
        <Link href="/login" className="underline hover:text-brass">
          Sign in
        </Link>
      </p>
    </div>
  );
}
