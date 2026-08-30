"use client";

import { useMemo, useState } from "react";
import { X, Divide } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; name: string; lot: string | null; purchase_cost: number };

export default function SplitCostTool({
  items,
  onClose,
  onUpdated,
}: {
  items: Item[];
  onClose: () => void;
  onUpdated: (updates: { id: string; purchase_cost: number }[]) => void;
}) {
  const supabase = createClient();
  const lots = useMemo(() => {
    const set = new Set(items.map((i) => i.lot).filter(Boolean) as string[]);
    return Array.from(set);
  }, [items]);

  const [selection, setSelection] = useState<string>(lots.length > 0 ? lots[0] : "__all__");
  const [totalPaid, setTotalPaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const selectedItems = selection === "__all__" ? items : items.filter((i) => i.lot === selection);
  const count = selectedItems.length;
  const total = parseFloat(totalPaid) || 0;
  const perItem = count > 0 ? total / count : 0;

  async function apply() {
    if (count === 0 || total <= 0) return;
    setSaving(true);
    setError("");

    const rounded = Math.round(perItem * 100) / 100;
    const { error } = await supabase
      .from("items")
      .update({ purchase_cost: rounded })
      .in("id", selectedItems.map((i) => i.id));

    setSaving(false);
    if (error) {
      setError("Couldn't update those items. Try again.");
      return;
    }
    onUpdated(selectedItems.map((i) => ({ id: i.id, purchase_cost: rounded })));
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-paper w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">Split cost evenly</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold mb-1">Done!</p>
            <p className="text-sm text-muted mb-5">
              Set {count} item{count !== 1 ? "s" : ""} to ${((Math.round(perItem * 100) / 100)).toFixed(2)} each.
            </p>
            <button onClick={onClose} className="bg-ink text-cream font-semibold py-2.5 px-6 rounded-xl">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#5b5647]">
              Bought a pallet for one price and want every item to carry an equal share of the cost? Pick which
              items and enter what you paid — it'll divide evenly.
            </p>

            {error && (
              <div className="text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2">{error}</div>
            )}

            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">Apply to</span>
              <select className="field-input" value={selection} onChange={(e) => setSelection(e.target.value)}>
                <option value="__all__">All items ({items.length})</option>
                {lots.map((l) => (
                  <option key={l} value={l}>
                    Lot {l} ({items.filter((i) => i.lot === l).length})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">Total you paid</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="field-input"
                placeholder="0.00"
                value={totalPaid}
                onChange={(e) => setTotalPaid(e.target.value)}
              />
            </label>

            <div className="bg-white border border-line rounded-lg p-3 text-sm flex items-center justify-between">
              <span className="text-muted">
                {count} item{count !== 1 ? "s" : ""} → each gets
              </span>
              <span className="font-semibold">${perItem.toFixed(2)}</span>
            </div>

            <button
              onClick={apply}
              disabled={saving || count === 0 || total <= 0}
              className="w-full bg-ink text-cream font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Divide size={16} /> {saving ? "Applying…" : `Apply to ${count} item${count !== 1 ? "s" : ""}`}
            </button>
            <p className="text-[11px] text-muted">
              This overwrites the current cost on each item in the selection — including ones you already set.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
