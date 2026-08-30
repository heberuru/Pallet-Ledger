import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, businesses(id, name, plan)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) {
    // Shouldn't normally happen — every signed-up user gets a business.
    redirect("/signup");
  }

  const business = Array.isArray(membership.businesses)
    ? membership.businesses[0]
    : membership.businesses;

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const { data: media } = await supabase
    .from("item_media")
    .select("*")
    .eq("business_id", business.id)
    .order("position", { ascending: true });

  return (
    <DashboardClient
      businessId={business.id}
      businessName={business.name}
      currentUserId={user.id}
      initialItems={items ?? []}
      initialMedia={media ?? []}
    />
  );
}
