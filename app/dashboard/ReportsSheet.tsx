
5 reportssheet · TXT
"use client";
 
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  TrendingUp,
  Trophy,
  Zap,
  Hourglass,
  Boxes,
} from "lucide-react";
 
type Item = {
  id: string;
  name: string;
  lot: string | null;
  category: string | null;
  purchase_cost: number;
  retail_price: number;
  date_acquired: string;
  status: "in_stock" | "sold";
  sold_price: number | null;
  date_sold: string | null;
};
 
const fmt = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
 
function parseDate(d: string | null): Date | null {
  if (!d) return null;
  return new Date(`${d}T00:00:00`);
}
 
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
 
function getWeekStart(d: Date) {
  const day = d.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday;
}
 
function getQuarter(d: Date) {
  return Math.floor(d.getMonth() / 3) + 1;
}
 
type Granularity = "day" | "week" | "month" | "quarter" | "year";
 
function periodKeyAndLabel(d: Date, granularity: Granularity): { key: string; label: string } {
  switch (granularity) {
    case "day": {
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { key, label };
    }
    case "week": {
      const start = getWeekStart(d);
      const key = start.toISOString().slice(0, 10);
      const label = `Wk of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      return { key, label };
    }
    case "month": {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return { key, label };
    }
    case "quarter": {
      const q = getQuarter(d);
      const key = `${d.getFullYear()}-Q${q}`;
      return { key, label: key };
    }
    case "year": {
      const key = String(d.getFullYear());
      return { key, label: key };
    }
  }
}
 
export default function ReportsSheet({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const [granularity, setGranularity] = useState<Granularity>("month");
 
  const soldItems = useMemo(() => items.filter((it) => it.status === "sold" && it.date_sold), [items]);
 
  const overall = useMemo(() => {
    const revenue = soldItems.reduce((s, it) => s + (it.sold_price || 0), 0);
    const cost = soldItems.reduce((s, it) => s + (it.purchase_cost || 0), 0);
    return { revenue, profit: revenue - cost, count: soldItems.length };
  }, [soldItems]);
 
  const periodRows = useMemo(() => {
    const map = new Map<string, { key: string; label: string; revenue: number; cost: number; count: number }>();
    for (const it of soldItems) {
      const d = parseDate(it.date_sold);
      if (!d) continue;
      const { key, label } = periodKeyAndLabel(d, granularity);
      const row = map.get(key) || { key, label, revenue: 0, cost: 0, count: 0 };
      row.revenue += it.sold_price || 0;
      row.cost += it.purchase_cost || 0;
      row.count += 1;
      map.set(key, row);
    }
    return Array.from(map.values())
      .sort((a, b) => b.key.localeCompare(a.key))
      .slice(0, 12);
  }, [soldItems, granularity]);
 
  const maxAbsProfit = Math.max(1, ...periodRows.map((r) => Math.abs(r.revenue - r.cost)));
 
  const topItems = useMemo(() => {
    return [...soldItems]
      .map((it) => ({ ...it, profit: (it.sold_price || 0) - (it.purchase_cost || 0) }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }, [soldItems]);
 
  const topPallets = useMemo(() => {
    const map = new Map<string, { lot: string; revenue: number; cost: number; count: number }>();
    for (const it of soldItems) {
      const lot = it.lot || "No pallet";
      const row = map.get(lot) || { lot, revenue: 0, cost: 0, count: 0 };
      row.revenue += it.sold_price || 0;
      row.cost += it.purchase_cost || 0;
      row.count += 1;
      map.set(lot, row);
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, profit: r.revenue - r.cost }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }, [soldItems]);
 
  const speedRanked = useMemo(() => {
    return soldItems
      .map((it) => {
        const acquired = parseDate(it.date_acquired);
        const sold = parseDate(it.date_sold);
        const days = acquired && sold ? daysBetween(acquired, sold) : null;
        return { ...it, days };
      })
      .filter((it) => it.days !== null) as (Item & { days: number })[];
  }, [soldItems]);
 
  const fastest = useMemo(() => [...speedRanked].sort((a, b) => a.days - b.days).slice(0, 5), [speedRanked]);
  const slowest = useMemo(() => [...speedRanked].sort((a, b) => b.days - a.days).slice(0, 5), [speedRanked]);
 
  const palletClearTimes = useMemo(() => {
    const byLot = new Map<string, Item[]>();
    for (const it of items) {
      if (!it.lot) continue;
      const arr = byLot.get(it.lot) || [];
      arr.push(it);
      byLot.set(it.lot, arr);
    }
    const rows: { lot: string; days: number; acquiredOn: string; clearedOn: string; count: number }[] = [];
    for (const [lot, lotItems] of byLot) {
      const allSold = lotItems.every((it) => it.status === "sold" && it.date_sold);
      if (!allSold) continue;
      const acquiredDates = lotItems.map((it) => parseDate(it.date_acquired)).filter(Boolean) as Date[];
      const soldDates = lotItems.map((it) => parseDate(it.date_sold)).filter(Boolean) as Date[];
      if (acquiredDates.length === 0 || soldDates.length === 0) continue;
      const earliestAcquired = new Date(Math.min(...acquiredDates.map((d) => d.getTime())));
      const latestSold = new Date(Math.max(...soldDates.map((d) => d.getTime())));
      rows.push({
        lot,
        days: daysBetween(earliestAcquired, latestSold),
        acquiredOn: earliestAcquired.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        clearedOn: latestSold.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        count: lotItems.length,
      });
    }
    return rows.sort((a, b) => b.days - a.days);
  }, [items]);
 
  const inProgressLots = useMemo(() => {
    const byLot = new Map<string, Item[]>();
    for (const it of items) {
      if (!it.lot) continue;
      const arr = byLot.get(it.lot) || [];
      arr.push(it);
      byLot.set(it.lot, arr);
    }
    let count = 0;
    for (const [, lotItems] of byLot) {
      if (!lotItems.every((it) => it.status === "sold")) count += 1;
    }
    return count;
  }, [items]);
 
  return (
    <div className="fixed inset-0 z-50 bg-cream overflow-y-auto">
      <div className="bg-ink text-cream px-5 pt-8 pb-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onClose} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-xl tracking-wide uppercase">Reports</h1>
        </div>
        <p className="text-sm text-[#c9c3b4] pl-8">Based on {soldItems.length} sold items</p>
      </div>
 
      <div className="px-4 py-5 space-y-8 max-w-2xl mx-auto">
        {/* Overall */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Total revenue" value={fmt(overall.revenue)} />
          <SummaryCard label="Total profit" value={fmt(overall.profit)} accent={overall.profit >= 0 ? "#2E7D4F" : "#B23A2E"} />
          <SummaryCard label="Items sold" value={String(overall.count)} />
        </div>
 
        {/* Time-based breakdown */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp size={16} /> Sales over time
            </h2>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
              className="text-xs font-medium border border-input bg-white px-2 py-1 rounded-full"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          {periodRows.length === 0 ? (
            <EmptyNote text="No sales recorded yet." />
          ) : (
            <div className="space-y-2">
              {periodRows.map((r) => {
                const profit = r.revenue - r.cost;
                const width = Math.max(4, (Math.abs(profit) / maxAbsProfit) * 100);
                return (
                  <div key={r.key} className="bg-white border border-line rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-muted">{r.count} sold</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-cream rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${width}%`, background: profit >= 0 ? "#2E7D4F" : "#B23A2E" }}
                        />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: profit >= 0 ? "#2E7D4F" : "#B23A2E" }}>
                        {fmt(profit)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted mt-0.5">Revenue {fmt(r.revenue)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
 
        {/* Top items */}
        <section>
          <h2 className="font-display text-sm uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Trophy size={16} /> Top earning items
          </h2>
          {topItems.length === 0 ? (
            <EmptyNote text="No sold items yet." />
          ) : (
            <RankedList
              rows={topItems.map((it, i) => ({
                key: it.id,
                rank: i + 1,
                title: it.name,
                subtitle: it.lot ? `Lot ${it.lot}` : undefined,
                value: fmt(it.profit),
                positive: it.profit >= 0,
              }))}
            />
          )}
        </section>
 
        {/* Top pallets */}
        <section>
          <h2 className="font-display text-sm uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Boxes size={16} /> Top earning pallets
          </h2>
          {topPallets.length === 0 ? (
            <EmptyNote text="No sold items yet." />
          ) : (
            <RankedList
              rows={topPallets.map((r, i) => ({
                key: r.lot,
                rank: i + 1,
                title: r.lot,
                subtitle: `${r.count} item${r.count !== 1 ? "s" : ""} sold`,
                value: fmt(r.profit),
                positive: r.profit >= 0,
              }))}
            />
          )}
        </section>
 
        {/* Speed */}
        <section>
          <h2 className="font-display text-sm uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Zap size={16} /> Fastest sellers
          </h2>
          {fastest.length === 0 ? (
            <EmptyNote text="No sold items yet." />
          ) : (
            <RankedList
              rows={fastest.map((it, i) => ({
                key: it.id,
                rank: i + 1,
                title: it.name,
                subtitle: it.lot ? `Lot ${it.lot}` : undefined,
                value: `${it.days} day${it.days !== 1 ? "s" : ""}`,
              }))}
            />
          )}
        </section>
 
        <section>
          <h2 className="font-display text-sm uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Hourglass size={16} /> Slowest sellers
          </h2>
          {slowest.length === 0 ? (
            <EmptyNote text="No sold items yet." />
          ) : (
            <RankedList
              rows={slowest.map((it, i) => ({
                key: it.id,
                rank: i + 1,
                title: it.name,
                subtitle: it.lot ? `Lot ${it.lot}` : undefined,
                value: `${it.days} day${it.days !== 1 ? "s" : ""}`,
              }))}
            />
          )}
        </section>
 
        {/* Pallet clearance time */}
        <section className="pb-8">
          <h2 className="font-display text-sm uppercase tracking-wide flex items-center gap-1.5 mb-1">
            <Hourglass size={16} /> Slowest pallets to fully sell
          </h2>
          <p className="text-xs text-muted mb-3">
            Only pallets where every item has sold. {inProgressLots > 0 && `${inProgressLots} pallet${inProgressLots !== 1 ? "s" : ""} still in progress.`}
          </p>
          {palletClearTimes.length === 0 ? (
            <EmptyNote text="No fully-sold pallets yet." />
          ) : (
            <div className="space-y-2">
              {palletClearTimes.map((r, i) => (
                <div key={r.lot} className="bg-white border border-line rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {i === 0 && <span className="text-amber mr-1">👑</span>}
                      {r.lot}
                    </p>
                    <p className="text-[11px] text-muted">
                      {r.acquiredOn} → {r.clearedOn} · {r.count} items
                    </p>
                  </div>
                  <span className="text-sm font-semibold flex-shrink-0 ml-2">{r.days}d</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
 
function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-line px-3 py-3">
      <p className="text-[10px] text-muted uppercase font-medium">{label}</p>
      <p className="text-base font-semibold mt-0.5" style={{ color: accent || "#211D17" }}>
        {value}
      </p>
    </div>
  );
}
 
function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm text-muted bg-white border border-line rounded-lg px-3 py-4 text-center">{text}</p>;
}
 
function RankedList({
  rows,
}: {
  rows: { key: string; rank: number; title: string; subtitle?: string; value: string; positive?: boolean }[];
}) {
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.key} className="bg-white border border-line rounded-lg px-3 py-2.5 flex items-center gap-3">
          <span className="text-xs font-semibold text-muted w-4 flex-shrink-0">{r.rank}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{r.title}</p>
            {r.subtitle && <p className="text-[11px] text-muted">{r.subtitle}</p>}
          </div>
          <span
            className="text-sm font-semibold flex-shrink-0"
            style={{ color: r.positive === undefined ? "#211D17" : r.positive ? "#2E7D4F" : "#B23A2E" }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
 
