import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, businesses(id, stripe_customer_id)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No business found" }, { status: 400 });
  }

  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
  const origin = request.headers.get("origin") || "https://palletledger.com";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    customer: business?.stripe_customer_id || undefined,
    customer_email: business?.stripe_customer_id ? undefined : user.email || undefined,
    client_reference_id: business?.id,
    metadata: { business_id: business?.id || "" },
    subscription_data: { metadata: { business_id: business?.id || "" } },
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
