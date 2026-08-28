"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) setError("Invalid email or password.");
    else router.push("/admin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal">
      <div className="max-w-sm w-full mx-auto px-8 py-16">
        <p className="text-center font-display text-3xl text-bone mb-1">Gursha</p>
        <h1 className="text-center text-xs uppercase tracking-widest2 text-bone/50 mb-10">
          Floor Office — Staff Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-bone/20 px-4 py-3 bg-transparent text-bone placeholder:text-bone/40 focus:outline-none focus:border-brass" />
          <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-bone/20 px-4 py-3 bg-transparent text-bone placeholder:text-bone/40 focus:outline-none focus:border-brass" />
          {error && <p className="text-sm text-berbere-100">{error}</p>}
          <button type="submit" className="w-full bg-brass text-charcoal py-3 tracking-widest2 uppercase text-sm hover:bg-bone transition-colors">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
