"use client";

import { useEffect, useState } from "react";
import { X, UserPlus, Copy, Check, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Member = { user_id: string; email: string; role: string; joined_at: string };
type Invite = { id: string; email: string | null; token: string; status: string; created_at: string };

export default function TeamSheet({
  businessId,
  currentUserId,
  onClose,
}: {
  businessId: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isOwner = members.find((m) => m.user_id === currentUserId)?.role === "owner";

  useEffect(() => {
    (async () => {
      const { data: teamData, error: teamError } = await supabase.rpc("list_team", {
        p_business_id: businessId,
      });
      if (!teamError && teamData) setMembers(teamData as Member[]);

      const { data: inviteData } = await supabase
        .from("invites")
        .select("id, email, token, status, created_at")
        .eq("business_id", businessId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (inviteData) setInvites(inviteData as Invite[]);

      setLoading(false);
    })();
  }, [businessId]);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const { data, error } = await supabase
      .from("invites")
      .insert({ business_id: businessId, email: inviteEmail.trim() || null })
      .select()
      .single();
    setCreating(false);
    if (error || !data) {
      setError("Couldn't create an invite. Only the owner can invite people.");
      return;
    }
    setInvites([data as Invite, ...invites]);
    setInviteEmail("");
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase.from("invites").update({ status: "revoked" }).eq("id", id);
    if (!error) setInvites(invites.filter((i) => i.id !== id));
  }

  function copyLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-paper w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">Team</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <>
            {error && (
              <div className="text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2 mb-3">
                {error}
              </div>
            )}

            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Members</p>
            <div className="space-y-2 mb-5">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between bg-white border border-line rounded-lg px-3 py-2">
                  <span className="text-sm truncate">{m.email}</span>
                  <span className="text-[10px] uppercase font-medium text-muted bg-cream px-2 py-0.5 rounded-full">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>

            {isOwner && (
              <>
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Invite someone</p>
                <form onSubmit={createInvite} className="flex gap-2 mb-4">
                  <input
                    type="email"
                    className="field-input"
                    placeholder="their email (optional)"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-shrink-0 bg-ink text-cream px-3 rounded-xl flex items-center gap-1.5 text-sm font-semibold disabled:opacity-60"
                  >
                    <UserPlus size={15} /> Invite
                  </button>
                </form>

                {invites.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Pending invites</p>
                    <div className="space-y-2">
                      {invites.map((inv) => (
                        <div key={inv.id} className="bg-white border border-line rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm truncate text-muted">{inv.email || "No email set"}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => copyLink(inv.token)}
                                className="text-xs font-medium text-ink inline-flex items-center gap-1"
                              >
                                {copiedToken === inv.token ? (
                                  <>
                                    <Check size={13} /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} /> Copy link
                                  </>
                                )}
                              </button>
                              <button onClick={() => revokeInvite(inv.id)} className="text-muted hover:text-rust" aria-label="Revoke invite">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <p className="text-[11px] text-muted mt-3">
                  Copy the link and send it however you like — text, WhatsApp, email. It expires in 14 days.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
