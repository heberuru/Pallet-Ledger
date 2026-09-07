import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const businessId = session.metadata?.business_id || session.client_reference_id;
    if (businessId) {
      await supabase
        .from("businesses")
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: "active",
        })
        .eq("id", businessId);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const businessId = sub.metadata?.business_id;
    const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;

    if (businessId) {
      await supabase.from("businesses").update({ subscription_status: status }).eq("id", businessId);
    } else {
      await supabase
        .from("businesses")
        .update({ subscription_status: status })
        .eq("stripe_customer_id", sub.customer as string);
    }
  }

  return NextResponse.json({ received: true });
}
