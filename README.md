# Pallet Ledger

A multi-tenant inventory tracker for pallet/liquidation resellers. Each
signup gets their own isolated "business" — cost tracking, sale tracking,
and profit dashboard.

Stack: Next.js (App Router) + Supabase (Postgres, Auth) + Tailwind.
Everything below is free-tier until you have real paying customers.

## 1. Create your Supabase project (free)

1. Go to https://supabase.com → New project.
2. Once it's created, open **SQL Editor** and paste the full contents of
   `supabase/schema.sql`, then run it. This creates the `businesses`,
   `business_members`, and `items` tables plus the row-level security
   policies that keep each customer's data private.
3. Go to **Authentication → Providers** and make sure Email is enabled
   (it is by default). For launch, you can turn off "Confirm email" under
   Authentication → Settings if you want signup to be instant — turn it
   back on once you're ready for production-grade signups.
4. Go to **Settings → API** and copy the **Project URL** and **anon
   public key**.
5. The same `schema.sql` also creates a public storage bucket called
   `item-media` (for photos/video) with policies so only members of a
   business can upload or delete its files. Nothing extra to configure —
   just make sure `schema.sql` ran without errors.

## 2. Configure the app

```bash
cp .env.local.example .env.local
```

Paste your Project URL and anon key into `.env.local`.

## 3. Run it locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000 — sign up, and you'll land on your dashboard.

## 4. Deploy for free

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com → New Project → import the repo.
3. Add the two env vars from `.env.local` in Vercel's project settings.
4. Deploy. You'll get a free `*.vercel.app` URL immediately; you can
   point a custom domain at it later for ~$12/year.

## What's built (Phase 1)

- Email/password auth (Supabase)
- Each signup automatically gets their own private "business" —
  this is what lets you sell to unrelated customers safely
- Full item CRUD: log an item, mark it sold (price + payment method),
  undo a sale, delete
- Dashboard: total invested, revenue, profit on sold items, in-stock
  vs. sold counts
- Same visual identity as the original prototype (kraft-paper /
  warehouse aesthetic, Oswald + Work Sans)
- Tap any item to open its detail view with three tabs, Marketplace-style:
  - **Photos** — upload up to 10 (enforced both in the UI and by a
    database trigger, so the limit holds even outside the app). Use this
    for your own shots or ones saved from the B-Stock bidding listing.
  - **Video** — 1 per item, uploaded straight from your phone
  - **Retail link** — price, a link to the retailer's listing (with an
    optional affiliate link that's used instead once you have one), and
    up to 5 **retail comparison photos** — screenshots or product shots
    from the retailer's page, so it's visually obvious what "new" costs
- Files live in Supabase Storage under `item-media/{business_id}/{item_id}/…`,
  publicly readable (fast image loading, no signed-URL plumbing) but only
  writable/deletable by members of that business
- **Invite a partner** — tap the people icon in the header (owner only)
  to generate an invite link, then send it however you like (text, email,
  WhatsApp). It expires in 14 days and can be revoked before it's used.
  Whoever opens it signs up or logs in and lands in your business, not a
  new one of their own.
- **Forgot password** — "Forgot password?" on the login page sends a
  reset link using Supabase's built-in email sender. No setup needed to
  test it, but that sender is rate-limited (a few emails/hour) and meant
  for development, not real users at scale — see the SMTP note below
  when you're ready to launch for real.
- **Import a B-Stock manifest** — the file icon above the "+" button
  opens a manifest importer. Upload the .xlsx/.csv B-Stock gives you when
  you win a bid, match the Item / Quantity / Unit Retail columns (it
  guesses these automatically for standard B-Stock headers), enter the
  lot number and total you paid, and every line item is created
  automatically — one item per unit, with your cost split across items
  in proportion to retail price so pricier items carry more of what you
  paid.

## What's next (Phase 2 — when you're ready)

- **Stripe billing** — gate item count or seats behind a paid plan; the
  `businesses.plan` column is already there to check against.
- **Real transactional email** — both invite links and password resets
  currently ride on Supabase's default sender, which is rate-limited.
  Before real users sign up, go to Supabase → Authentication → Email and
  connect your own SMTP (or a provider like Resend) so these emails
  reliably land in inboxes and aren't rate-limited.
- **Per-lot rollups** — group items by `lot` and show cost/revenue/profit
  per pallet, not just overall.
- **Reordering photos** — drag-to-reorder for the cover photo (currently
  first-uploaded = cover).
