"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const supabase = createClient();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError || !signUpData.user) {
      setError(signUpError?.message || "Couldn't create your account.");
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
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({ name: businessName || "My Pallet Business", owner_id: signUpData.user.id })
      .select()
      .single();

    if (bizError || !business) {
      setError("Account created, but we couldn't set up your business. Try logging in.");
      setLoading(false);
      return;
    }

    await supabase.from("business_members").insert({
      business_id: business.id,
      user_id: signUpData.user.id,
      role: "owner",
    });

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-2xl uppercase text-ink mb-2">
          {inviteToken ? "Join your team" : "Start your ledger"}
        </h1>

        {error && (
          <div className="text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {!inviteToken && (
          <label className="block">
            <span className="text-xs font-medium text-muted mb-1 block">
              Business name
            </span>
            <input
              className="field-input"
              placeholder="e.g. Ramirez Family Flips"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </label>
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
            minLength={6}
            type="password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-cream font-semibold py-3 rounded-xl disabled:opacity-60"
        >
          {loading ? "Creating account…" : inviteToken ? "Create account & join" : "Create account"}
        </button>

        <p className="text-sm text-muted text-center">
          Already have an account?{" "}
          <Link href={inviteToken ? `/login?invite=${inviteToken}` : "/login"} className="underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
