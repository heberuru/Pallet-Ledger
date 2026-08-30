"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Clicking the emailed link gives this page a temporary "recovery"
    // session. Supabase's client picks it up from the URL automatically —
    // we just wait for that to land before showing the form.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    const timeout = setTimeout(() => {
      setInvalid((current) => (ready ? current : true));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password needs to be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl uppercase text-ink mb-2">Set a new password</h1>

        {invalid && !ready ? (
          <p className="text-sm text-[#5b5647]">
            This reset link is invalid or has expired. Go back and request a new one from the
            login page.
          </p>
        ) : done ? (
          <p className="text-sm text-[#5b5647]">Password updated — taking you to your dashboard…</p>
        ) : !ready ? (
          <p className="text-sm text-muted">Verifying your link…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">New password</span>
              <input
                required
                minLength={6}
                type="password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">Confirm password</span>
              <input
                required
                minLength={6}
                type="password"
                className="field-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-cream font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
