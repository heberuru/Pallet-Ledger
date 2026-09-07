"use client";

import { useState } from "react";
import { X, Copy, Check, ExternalLink, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function StorefrontSheet({
  businessId,
  initialContact,
  onClose,
}: {
  businessId: string;
  initialContact: string | null;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [contact, setContact] = useState(initialContact || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const link = typeof window !== "undefined" ? `${window.location.origin}/store/${businessId}` : "";

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    const { error } = await supabase
      .from("businesses")
      .update({ storefront_contact: contact.trim() || null })
      .eq("id", businessId);
    setSaving(false);
    if (error) {
      setError("Couldn't save. Try again.");
      return;
    }
    setSaved(true);
  }

  function copyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-paper w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide flex items-center gap-2">
            <Store size={18} /> Storefront
          </h2>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2 mb-3">{error}</div>
        )}

        <p className="text-sm text-[#5b5647] mb-4">
          A public page where anyone can browse and buy — no login needed. Give an item a{" "}
          <b>selling price</b> in its Details tab and it shows up here automatically.
        </p>

        <label className="block mb-4">
          <span className="text-xs font-medium text-muted mb-1 block">Your public link</span>
          <div className="flex gap-2">
            <input readOnly value={link} className="field-input flex-1 text-xs" />
            <button
              onClick={copyLink}
              className="flex-shrink-0 bg-ink text-cream px-3 rounded-xl flex items-center gap-1 text-xs font-semibold"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </label>

        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink underline mb-5"
        >
          View your storefront <ExternalLink size={13} />
        </a>

        <label className="block">
          <span className="text-xs font-medium text-muted mb-1 block">
            Contact info shown to buyers
          </span>
          <input
            className="field-input"
            placeholder="e.g. Text (555) 123-4567 or email you@example.com"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </label>
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-ink text-cream font-semibold py-3 rounded-xl mt-3 disabled:opacity-60"
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save contact info"}
        </button>
      </div>
    </div>
  );
}
