import Link from "next/link";
import { Boxes } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-ink text-cream flex flex-col">
      <div className="max-w-md mx-auto w-full px-6 pt-20 pb-12 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Boxes size={22} className="text-amber" />
          <span className="font-display uppercase tracking-wide text-sm text-[#c9c3b4]">
            Pallet Ledger
          </span>
        </div>
        <h1 className="font-display text-4xl uppercase leading-tight mb-4">
          Know what every pallet actually made you.
        </h1>
        <p className="text-[#c9c3b4] text-base mb-10">
          Log what you paid, tap "sold" when it moves, and see your real
          profit — per item and per lot. Built for pallet and liquidation
          resellers, not warehouses.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/signup"
            className="bg-amber text-ink font-semibold text-center py-3 rounded-xl"
          >
            Start free
          </Link>
          <Link
            href="/login"
            className="border border-[#3a352b] text-cream text-center py-3 rounded-xl"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
