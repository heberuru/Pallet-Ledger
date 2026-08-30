"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function InviteClient({
  token,
  businessName,
  status,
  expiresAt,
  isLoggedIn,
}: {
  token: string;
  businessName: string;
  status: string;
  expiresAt: string;
  isLoggedIn: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const expired = new Date(expiresAt) < new Date();
  const usable = status === "pending" && !expired;

  async function join() {
    setLoading(true);
    setError("");
    const { error } = await supabase.rpc("accept_invite", { p_token: token });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-ink text-cream flex flex-col items-center justify-center px-6 text-center">
      <Boxes size={26} className="text-amber mb-3" />
      <p className="text-sm text-[#c9c3b4] mb-1">You've been invited to</p>
      <h1 className="font-display text-3xl uppercase mb-6">{businessName}</h1>

      {!usable ? (
        <p className="text-[#c9c3b4] text-sm max-w-xs">
          {status === "accepted"
            ? "This invite has already been used."
            : status === "revoked"
            ? "This invite was revoked by the business owner."
            : "This invite has expired. Ask them to send a new one."}
        </p>
      ) : isLoggedIn ? (
        <div className="w-full max-w-xs">
          {error && (
            <div className="text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}
          <button
            onClick={join}
            disabled={loading}
            className="w-full bg-amber text-ink font-semibold py-3 rounded-xl disabled:opacity-60"
          >
            {loading ? "Joining…" : `Join ${businessName}`}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href={`/signup?invite=${token}`}
            className="bg-amber text-ink font-semibold text-center py-3 rounded-xl"
          >
            Create an account to join
          </Link>
          <Link
            href={`/login?invite=${token}`}
            className="border border-[#3a352b] text-cream text-center py-3 rounded-xl"
          >
            I already have an account
          </Link>
        </div>
      )}
    </main>
  );
}
