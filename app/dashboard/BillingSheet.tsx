"use client";

import { useState } from "react";
import { X, CreditCard, Clock, CheckCircle2 } from "lucide-react";

const PRICE = "$99/mo";
const ITEM_LIMIT = 20;

export default function BillingSheet({
  subscriptionStatus,
  trialEndsAt,
  itemCount,
  onClose,
}: {
  subscriptionStatus: string;
  trialEndsAt: string | null;
  itemCount: number;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isActive = subscriptionStatus === "active";
  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
  const inTrial = !isActive && !!trialEnd && trialEnd.getTime() > Date.now();
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;
  const locked = !isActive && !inTrial && itemCount >= ITEM_LIMIT;

  async function goToCheckout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError("Couldn't start checkout. Try again.");
    } catch {
      setError("Couldn't start checkout. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function goToPortal() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError("Couldn't open billing portal.");
    } catch {
      setError("Couldn't open billing portal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-paper w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide flex items-center gap-2">
            <CreditCard size={18} /> Billing
          </h2>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2 mb-3">{error}</div>
        )}

        {isActive ? (
          <div>
            <div className="bg-white border border-line rounded-xl p-4 mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green" />
              <div>
                <p className="text-sm font-semibold">Pallet Ledger Pro</p>
                <p className="text-xs text-muted">{PRICE} — active</p>
              </div>
            </div>
            <button
              onClick={goToPortal}
              disabled={loading}
              className="w-full bg-ink text-cream font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {loading ? "Opening…" : "Manage billing"}
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-white border border-line rounded-xl p-4 mb-4">
              {inTrial ? (
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-amber" />
                  <div>
                    <p className="text-sm font-semibold">
                      {daysLeft} day{daysLeft !== 1 ? "s" : ""} left in trial
                    </p>
                    <p className="text-xs text-muted">Unlimited items during your trial</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-rust" />
                  <div>
                    <p className="text-sm font-semibold">Trial ended</p>
                    <p className="text-xs text-muted">
                      {itemCount}/{ITEM_LIMIT} items used on the free limit
                    </p>
                  </div>
                </div>
              )}
            </div>

            {locked && (
              <div className="text-sm bg-[#FDF3E0] border border-amber text-[#7a5a0a] rounded-lg px-3 py-2 mb-4">
                You've hit the {ITEM_LIMIT}-item free limit. Upgrade to keep adding items.
              </div>
            )}

            <p className="text-sm text-[#5b5647] mb-3">
              <b>{PRICE}</b> — unlimited items, unlimited team members, full storefront and reports.
            </p>
            <button
              onClick={goToCheckout}
              disabled={loading}
              className="w-full bg-amber text-ink font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {loading ? "Loading…" : "Upgrade to Pro"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
