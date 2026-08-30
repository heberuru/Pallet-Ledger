"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (inviteToken) {
      const { error: acceptError } = await supabase.rpc("accept_invite", { p_token: inviteToken });
      setLoading(false);
      if (acceptError) {
        setError(acceptError.message);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-2xl uppercase text-ink mb-2">
          {inviteToken ? "Log in to join" : "Welcome back"}
        </h1>

        {error && (
          <div className="text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-xs font-medium text-muted mb-1 block">Email</span>
          <input
            required
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted mb-1 block">
            Password
          </span>
          <input
            required
            type="password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Link href="/forgot-password" className="text-xs text-muted underline mt-1 inline-block">
            Forgot password?
          </Link>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-cream font-semibold py-3 rounded-xl disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>

        <p className="text-sm text-muted text-center">
          Don't have an account?{" "}
          <Link href={inviteToken ? `/signup?invite=${inviteToken}` : "/signup"} className="underline">
            Start free
          </Link>
        </p>
      </form>
    </main>
  );
}
