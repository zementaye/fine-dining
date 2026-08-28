"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Optional guest account registration (per spec: "guest accounts optional").
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push("/login");
    else setError("Could not create account — that email may already be registered.");
  }

  return (
    <div className="max-w-sm mx-auto px-8 py-24">
      <h1 className="font-display text-3xl text-center mb-10">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required placeholder="Name" className="w-full border border-charcoal/20 px-4 py-3 bg-transparent"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" placeholder="Email" className="w-full border border-charcoal/20 px-4 py-3 bg-transparent"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" placeholder="Password" className="w-full border border-charcoal/20 px-4 py-3 bg-transparent"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="w-full bg-charcoal text-bone py-3 tracking-widest2 uppercase text-sm">
          Create Account
        </button>
      </form>
    </div>
  );
}
