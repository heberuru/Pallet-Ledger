import { createClient } from "@/lib/supabase/server";
import InviteClient from "./InviteClient";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc("get_invite_details", { p_token: params.token })
    .single();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (error || !data) {
    return (
      <main className="min-h-screen bg-ink text-cream flex items-center justify-center px-6 text-center">
        <p className="text-[#c9c3b4]">This invite link isn't valid. Ask whoever sent it for a new one.</p>
      </main>
    );
  }

  return (
    <InviteClient
      token={params.token}
      businessName={(data as any).business_name}
      status={(data as any).status}
      expiresAt={(data as any).expires_at}
      isLoggedIn={!!user}
    />
  );
}
