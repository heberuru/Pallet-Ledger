"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl uppercase text-ink mb-2">Reset password</h1>

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-[#5b5647]">
              If an account exists for <b>{email}</b>, we've sent a link to reset the password. It
              can take a couple minutes to arrive — check spam too.
            </p>
            <Link href="/login" className="block text-sm text-ink underline text-center">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-[#5b5647] mb-2">
              Enter the email on your account and we'll send a link to reset your password.
            </p>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-cream font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>

            <p className="text-sm text-muted text-center">
              <Link href="/login" className="underline">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
