import Link from "next/link";
import {
  Boxes,
  Camera,
  FileUp,
  Divide,
  Users,
  Link as LinkIcon,
  Package,
  CheckCircle2,
  TrendingUp,
  Store,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      {/* Nav */}
      <nav className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes size={20} className="text-amber" />
          <span className="font-display uppercase tracking-wide text-sm">Pallet Ledger</span>
        </div>
        <Link href="/login" className="text-sm font-medium underline">
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-8 pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="font-display text-4xl md:text-5xl uppercase leading-tight mb-4">
            Know what every pallet actually made you.
          </h1>
          <p className="text-[#5b5647] text-lg mb-8">
            Log what you paid, tap "sold" when it moves, and see your real profit — per item and per lot.
            Built for B-Stock and liquidation resellers, not warehouses.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="bg-amber text-ink font-semibold text-center py-3 px-6 rounded-xl"
            >
              Start free
            </Link>
            <Link
              href="/login"
              className="border border-input text-ink text-center py-3 px-6 rounded-xl"
            >
              Log in
            </Link>
          </div>
          <p className="text-xs text-muted mt-4">No credit card. Set up in under a minute.</p>
        </div>

        {/* Mocked dashboard preview */}
        <div className="bg-ink rounded-3xl p-3 shadow-2xl mx-auto w-full max-w-[300px]">
          <div className="bg-cream rounded-2xl overflow-hidden text-ink">
            <div className="bg-ink text-cream px-4 pt-5 pb-4">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Boxes size={14} className="text-amber" />
                <span className="font-display text-xs uppercase tracking-wide">Pallet Ledger</span>
              </div>
              <p className="text-[10px] text-[#c9c3b4]">Rocha Goods</p>
            </div>
            <div className="px-3 -mt-2">
              <div className="grid grid-cols-2 gap-1.5">
                <MockStat label="Invested" value="$1,240" />
                <MockStat label="Revenue" value="$2,860" />
                <MockStat label="Profit" value="$1,210" accent="#2E7D4F" />
                <MockStat label="In stock / Sold" value="14 / 22" />
              </div>
            </div>
            <div className="px-3 mt-3 pb-4 space-y-2">
              <MockItem name="Dyson V8 Vacuum" cost="$42.00" sold />
              <MockItem name="KitchenAid Mixer" cost="$58.00" />
              <MockItem name="Bose Headphones" cost="$31.00" sold />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-line py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-2xl uppercase text-center mb-10">Built for how you actually buy</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            <Feature
              icon={<FileUp size={20} />}
              title="Import your manifest"
              body="Upload the B-Stock spreadsheet from a winning bid and every line item is created automatically — no retyping, each pallet kept separate."
            />
            <Feature
              icon={<Divide size={20} />}
              title="Split cost evenly"
              body="Paid one price for the whole pallet? Split it evenly across every item, or let cost track by retail value automatically."
            />
            <Feature
              icon={<Camera size={20} />}
              title="Photos & video per item"
              body="Up to 10 photos and a video per listing, plus retail comparison photos so buyers can see what 'new' costs."
            />
            <Feature
              icon={<Store size={20} />}
              title="Your own storefront"
              body="Set a selling price on any item and it shows up on your public storefront page — no login required for buyers to browse."
            />
            <Feature
              icon={<Users size={20} />}
              title="Invite your team"
              body="Add a partner or family member with one link. Everyone sees the same live inventory, nothing duplicated."
            />
            <Feature
              icon={<TrendingUp size={20} />}
              title="Real profit reports"
              body="See profit by day, week, month, quarter, or year — plus your top-earning items, top pallets, and fastest sellers."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-display text-2xl uppercase text-center mb-2">Simple pricing</h2>
        <p className="text-center text-muted mb-10">Start free. Upgrade only if you outgrow it.</p>
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="bg-white border border-line rounded-2xl p-6">
            <p className="font-display uppercase text-sm text-muted mb-1">Free</p>
            <p className="text-3xl font-semibold mb-4">$0</p>
            <ul className="space-y-2 text-sm mb-6">
              <PricingLine text="Unlimited items" />
              <PricingLine text="Manifest import" />
              <PricingLine text="Photos & video" />
              <PricingLine text="1 team member" />
            </ul>
            <Link href="/signup" className="block text-center bg-ink text-cream font-semibold py-2.5 rounded-xl">
              Start free
            </Link>
          </div>
          <div className="bg-ink text-cream rounded-2xl p-6 relative overflow-hidden">
            <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase bg-amber text-ink px-2 py-0.5 rounded-full">
              Coming soon
            </span>
            <p className="font-display uppercase text-sm text-[#c9c3b4] mb-1">Pro</p>
            <p className="text-3xl font-semibold mb-4">—</p>
            <ul className="space-y-2 text-sm mb-6 text-[#c9c3b4]">
              <PricingLine text="Everything in Free" dark />
              <PricingLine text="Unlimited team members" dark />
              <PricingLine text="Per-lot profit rollups" dark />
              <PricingLine text="Priority support" dark />
            </ul>
            <button disabled className="w-full text-center border border-[#3a352b] text-[#c9c3b4] font-semibold py-2.5 rounded-xl opacity-60">
              Notify me
            </button>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-ink text-cream py-14 text-center">
        <h2 className="font-display text-2xl uppercase mb-4">Start tracking your next pallet</h2>
        <Link href="/signup" className="inline-block bg-amber text-ink font-semibold py-3 px-8 rounded-xl">
          Start free
        </Link>
      </section>

      <footer className="py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} Pallet Ledger · palletledger.com
      </footer>
    </main>
  );
}

function MockStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white rounded-lg border border-line px-2 py-1.5">
      <p className="text-[8px] text-muted uppercase font-medium">{label}</p>
      <p className="text-xs font-semibold" style={{ color: accent || "#211D17" }}>
        {value}
      </p>
    </div>
  );
}

function MockItem({ name, cost, sold }: { name: string; cost: string; sold?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-line px-2.5 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded bg-cream flex items-center justify-center flex-shrink-0">
          <Package size={12} className="text-input" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium truncate">{name}</p>
          <p className="text-[9px] text-muted">Cost: {cost}</p>
        </div>
      </div>
      {sold && (
        <span className="text-[8px] font-semibold text-green flex items-center gap-0.5 flex-shrink-0">
          <CheckCircle2 size={9} /> Sold
        </span>
      )}
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <div className="w-10 h-10 rounded-lg bg-cream border border-line flex items-center justify-center mb-3 text-ink">
        {icon}
      </div>
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
    </div>
  );
}

function PricingLine({ text, dark }: { text: string; dark?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 size={14} className={dark ? "text-amber" : "text-green"} />
      {text}
    </li>
  );
}
