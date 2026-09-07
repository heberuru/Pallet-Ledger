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
    .select("businesses(stripe_customer_id)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const business = Array.isArray(membership?.businesses) ? membership?.businesses[0] : membership?.businesses;
  if (!business?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet" }, { status: 400 });
  }

  const origin = request.headers.get("origin") || "https://palletledger.com";
  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripe_customer_id,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
