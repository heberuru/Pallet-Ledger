"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  X,
  DollarSign,
  CheckCircle2,
  RotateCcw,
  TrendingUp,
  Boxes,
  Receipt,
  LogOut,
  Images,
  Users,
  FileUp,
  Divide,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ItemDetail, { Media } from "./ItemDetail";
import TeamSheet from "./TeamSheet";
import ManifestImport from "./ManifestImport";
import SplitCostTool from "./SplitCostTool";

const PAYMENT_METHODS = ["Cash", "Zelle", "Venmo", "PayPal", "Cash App", "Card", "Other"];

type Item = {
  id: string;
  name: string;
  lot: string | null;
  purchase_cost: number;
  retail_price: number;
  retail_url: string | null;
  affiliate_url: string | null;
  date_acquired: string;
  status: "in_stock" | "sold";
  sold_price: number | null;
  payment_method: string | null;
  date_sold: string | null;
};

const fmt = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

const emptyForm = {
  name: "",
  lot: "",
  purchase_cost: "",
  retail_price: "",
  retail_url: "",
  date_acquired: new Date().toISOString().slice(0, 10),
};

const emptySoldForm = {
  sold_price: "",
  payment_method: PAYMENT_METHODS[0],
  date_sold: new Date().toISOString().slice(0, 10),
};

export default function DashboardClient({
  businessId,
  businessName,
  currentUserId,
  initialItems,
  initialMedia,
}: {
  businessId: string;
  businessName: string;
  currentUserId: string;
  initialItems: Item[];
  initialMedia: Media[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [items, setItems] = useState<Item[]>(initialItems);
  const [media, setMedia] = useState<Media[]>(initialMedia);
  const [showAdd, setShowAdd] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showManifest, setShowManifest] = useState(false);
  const [showSplitCost, setShowSplitCost] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [soldModalId, setSoldModalId] = useState<string | null>(null);
  const [soldForm, setSoldForm] = useState(emptySoldForm);
  const [filter, setFilter] = useState<"all" | "in_stock" | "sold">("all");
  const [lotFilter, setLotFilter] = useState<string>("__all__");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  async function reloadItems() {
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    if (data) setItems(data as Item[]);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.purchase_cost) return;
    setSaving(true);
    setError("");

    const { data, error } = await supabase
      .from("items")
      .insert({
        business_id: businessId,
        name: form.name.trim(),
        lot: form.lot.trim() || null,
        purchase_cost: parseFloat(form.purchase_cost) || 0,
        retail_price: parseFloat(form.retail_price) || 0,
        retail_url: form.retail_url.trim() || null,
        date_acquired: form.date_acquired,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) {
      setError("Couldn't save that item. Try again.");
      return;
    }
    const newItem = data as Item;
    setItems([newItem, ...items]);
    setForm(emptyForm);
    setShowAdd(false);
    // Jump straight into photo/video upload for the item just logged
    setDetailItemId(newItem.id);
  }

  async function confirmSold(e: React.FormEvent) {
    e.preventDefault();
    if (!soldModalId) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("items")
      .update({
        status: "sold",
        sold_price: parseFloat(soldForm.sold_price) || 0,
        payment_method: soldForm.payment_method,
        date_sold: soldForm.date_sold,
      })
      .eq("id", soldModalId)
      .select()
      .single();

    setSaving(false);
    if (error || !data) {
      setError("Couldn't mark that as sold. Try again.");
      return;
    }
    setItems(items.map((it) => (it.id === soldModalId ? (data as Item) : it)));
    setSoldModalId(null);
  }

  async function revertToStock(id: string) {
    const { data, error } = await supabase
      .from("items")
      .update({ status: "in_stock", sold_price: null, payment_method: null, date_sold: null })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      setItems(items.map((it) => (it.id === id ? (data as Item) : it)));
    }
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (!error) {
      setItems(items.filter((it) => it.id !== id));
      setMedia(media.filter((m) => m.item_id !== id));
    }
  }

  const lots = useMemo(() => {
    const set = new Set(items.map((i) => i.lot).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [items]);

  const lotScopedItems = useMemo(
    () => (lotFilter === "__all__" ? items : items.filter((it) => it.lot === lotFilter)),
    [items, lotFilter]
  );

  const stats = useMemo(() => {
    const invested = lotScopedItems.reduce((s, it) => s + (it.purchase_cost || 0), 0);
    const sold = lotScopedItems.filter((it) => it.status === "sold");
    const revenue = sold.reduce((s, it) => s + (it.sold_price || 0), 0);
    const soldCost = sold.reduce((s, it) => s + (it.purchase_cost || 0), 0);
    return {
      invested,
      revenue,
      profit: revenue - soldCost,
      inStock: lotScopedItems.filter((it) => it.status === "in_stock").length,
      sold: sold.length,
    };
  }, [lotScopedItems]);

  const visible = lotScopedItems.filter((it) => (filter === "all" ? true : it.status === filter));
  const detailItem = items.find((it) => it.id === detailItemId) || null;

  return (
    <div className="min-h-screen bg-cream text-ink pb-24">
      {/* Header */}
      <div className="bg-ink text-cream px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Boxes size={22} className="text-amber" />
            <h1 className="font-display text-2xl tracking-wide uppercase">Pallet Ledger</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowTeam(true)} className="text-[#c9c3b4]" aria-label="Team">
              <Users size={18} />
            </button>
            <button onClick={handleLogout} className="text-[#c9c3b4]" aria-label="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <p className="text-sm text-[#c9c3b4]">{businessName}</p>
      </div>

      {/* Pallet selector */}
      {lots.length > 0 && (
        <div className="px-4 -mt-4">
          <select
            className="field-input text-sm font-medium bg-white shadow-sm"
            value={lotFilter}
            onChange={(e) => setLotFilter(e.target.value)}
          >
            <option value="__all__">All pallets ({items.length} items)</option>
            {lots.map((l) => (
              <option key={l} value={l}>
                Lot {l} ({items.filter((i) => i.lot === l).length} items)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 mt-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Receipt size={16} />} label="Invested" value={fmt(stats.invested)} />
          <StatCard icon={<DollarSign size={16} />} label="Revenue" value={fmt(stats.revenue)} />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Profit (sold)"
            value={fmt(stats.profit)}
            accent={stats.profit >= 0 ? "#2E7D4F" : "#B23A2E"}
          />
          <StatCard icon={<Package size={16} />} label="In stock / Sold" value={`${stats.inStock} / ${stats.sold}`} />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 mt-5 items-center justify-between">
        <div className="flex gap-2">
          {(["all", "in_stock", "sold"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === key ? "bg-ink text-cream border-ink" : "bg-white text-ink border-input"
              }`}
            >
              {key === "all" ? "All" : key === "in_stock" ? "In stock" : "Sold"}
            </button>
          ))}
        </div>
        {items.length > 0 && (
          <button
            onClick={() => setShowSplitCost(true)}
            className="flex items-center gap-1 text-xs font-medium text-muted border border-input bg-white px-2.5 py-1.5 rounded-full"
          >
            <Divide size={13} /> Split cost
          </button>
        )}
      </div>

      {/* Item list */}
      <div className="px-4 mt-4 space-y-3">
        {visible.length === 0 && (
          <div className="text-center py-16 text-muted">
            <Package className="mx-auto mb-2 opacity-40" size={32} />
            <p className="text-sm">No items yet. Tap + to log your first buy.</p>
          </div>
        )}
        {visible.map((it) => {
          const itemMedia = media.filter((m) => m.item_id === it.id);
          const cover = itemMedia.filter((m) => m.type === "photo").sort((a, b) => a.position - b.position)[0];
          return (
            <ItemCard
              key={it.id}
              item={it}
              coverUrl={cover?.url}
              photoCount={itemMedia.filter((m) => m.type === "photo").length}
              hasVideo={itemMedia.some((m) => m.type === "video")}
              onOpen={() => setDetailItemId(it.id)}
              onMarkSold={() => {
                setSoldForm(emptySoldForm);
                setSoldModalId(it.id);
              }}
              onRevert={() => revertToStock(it.id)}
              onRemove={() => removeItem(it.id)}
            />
          );
        })}
      </div>

      <button
        onClick={() => setShowManifest(true)}
        className="fixed bottom-24 right-5 bg-white border border-line text-ink rounded-full shadow-lg w-14 h-14 flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Import manifest"
      >
        <FileUp size={22} />
      </button>

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-5 bg-amber text-ink rounded-full shadow-lg w-14 h-14 flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Add item"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {showAdd && (
        <Sheet title="Log a new item" onClose={() => setShowAdd(false)}>
          <form onSubmit={addItem} className="space-y-3">
            <Field label="Item name *">
              <input
                required
                className="field-input"
                placeholder="e.g. Dyson V8 vacuum"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Lot / pallet #">
              <input
                className="field-input"
                placeholder="e.g. BTK-4471"
                value={form.lot}
                onChange={(e) => setForm({ ...form, lot: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Your cost *">
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  className="field-input"
                  placeholder="0.00"
                  value={form.purchase_cost}
                  onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })}
                />
              </Field>
              <Field label="Retail price (new)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="field-input"
                  placeholder="0.00"
                  value={form.retail_price}
                  onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Retailer link">
              <input
                type="url"
                className="field-input"
                placeholder="https://www.amazon.com/..."
                value={form.retail_url}
                onChange={(e) => setForm({ ...form, retail_url: e.target.value })}
              />
            </Field>
            <Field label="Date acquired">
              <input
                type="date"
                className="field-input"
                value={form.date_acquired}
                onChange={(e) => setForm({ ...form, date_acquired: e.target.value })}
              />
            </Field>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-ink text-cream font-semibold py-3 rounded-xl mt-2 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & add photos"}
            </button>
          </form>
        </Sheet>
      )}

      {soldModalId && (
        <Sheet title="Mark as sold" onClose={() => setSoldModalId(null)}>
          <form onSubmit={confirmSold} className="space-y-3">
            <Field label="Sale price *">
              <input
                required
                autoFocus
                type="number"
                step="0.01"
                min="0"
                className="field-input"
                placeholder="0.00"
                value={soldForm.sold_price}
                onChange={(e) => setSoldForm({ ...soldForm, sold_price: e.target.value })}
              />
            </Field>
            <Field label="Payment method">
              <select
                className="field-input"
                value={soldForm.payment_method}
                onChange={(e) => setSoldForm({ ...soldForm, payment_method: e.target.value })}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date sold">
              <input
                type="date"
                className="field-input"
                value={soldForm.date_sold}
                onChange={(e) => setSoldForm({ ...soldForm, date_sold: e.target.value })}
              />
            </Field>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green text-white font-semibold py-3 rounded-xl mt-2 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Confirm sale"}
            </button>
          </form>
        </Sheet>
      )}

      {detailItem && (
        <ItemDetail
          businessId={businessId}
          item={detailItem}
          media={media.filter((m) => m.item_id === detailItem.id)}
          onClose={() => setDetailItemId(null)}
          onMediaChange={(nextForItem) => {
            const others = media.filter((m) => m.item_id !== detailItem.id);
            setMedia([...others, ...nextForItem]);
          }}
          onItemChange={(updated) => {
            setItems(items.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)));
          }}
        />
      )}
      {showSplitCost && (
        <SplitCostTool
          items={items}
          onClose={() => setShowSplitCost(false)}
          onUpdated={(updates) => {
            const map = new Map(updates.map((u) => [u.id, u.purchase_cost]));
            setItems(items.map((it) => (map.has(it.id) ? { ...it, purchase_cost: map.get(it.id)! } : it)));
          }}
        />
      )}
      {showManifest && (
        <ManifestImport
          businessId={businessId}
          onClose={() => setShowManifest(false)}
          onImported={() => reloadItems()}
        />
      )}
      {showTeam && (
        <TeamSheet businessId={businessId} currentUserId={currentUserId} onClose={() => setShowTeam(false)} />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-line shadow-sm px-3 py-3">
      <div className="flex items-center gap-1.5 text-muted text-xs font-medium uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div style={{ color: accent || "#211D17" }} className="text-lg font-semibold mt-0.5">
        {value}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  coverUrl,
  photoCount,
  hasVideo,
  onOpen,
  onMarkSold,
  onRevert,
  onRemove,
}: {
  item: Item;
  coverUrl?: string;
  photoCount: number;
  hasVideo: boolean;
  onOpen: () => void;
  onMarkSold: () => void;
  onRevert: () => void;
  onRemove: () => void;
}) {
  const isSold = item.status === "sold";
  return (
    <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden relative">
      <div className="flex">
        <button onClick={onOpen} className="w-24 h-24 bg-cream flex-shrink-0 flex items-center justify-center relative">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="text-input" size={28} />
          )}
          {(photoCount > 0 || hasVideo) && (
            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
              <Images size={9} /> {photoCount}
              {hasVideo ? " +vid" : ""}
            </span>
          )}
        </button>
        <div className="flex-1 px-3 py-2.5 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <button onClick={onOpen} className="min-w-0 text-left">
              <p className="font-semibold text-sm truncate">{item.name}</p>
              {item.lot && <p className="text-[11px] text-muted">Lot {item.lot}</p>}
            </button>
            <button onClick={onRemove} className="text-input hover:text-rust flex-shrink-0" aria-label="Delete item">
              <X size={15} />
            </button>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-[#5b5647]">
            <span>
              Cost: <b>{fmt(item.purchase_cost)}</b>
            </span>
            {item.retail_price > 0 && (
              <span>
                Retail: <b>{fmt(item.retail_price)}</b>
              </span>
            )}
          </div>
          {isSold && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-green font-medium">
              <span>Sold: {fmt(item.sold_price)}</span>
              <span>via {item.payment_method}</span>
            </div>
          )}
          <div className="mt-1.5">
            {!isSold ? (
              <button
                onClick={onMarkSold}
                className="text-xs font-semibold bg-amber text-ink px-2.5 py-1 rounded-full inline-flex items-center gap-1"
              >
                <CheckCircle2 size={13} /> Mark sold
              </button>
            ) : (
              <button onClick={onRevert} className="text-xs font-medium text-muted inline-flex items-center gap-1">
                <RotateCcw size={12} /> Undo sale
              </button>
            )}
          </div>
        </div>
      </div>
      {isSold && (
        <div className="stamp absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-white/70 pointer-events-none">
          SOLD
        </div>
      )}
    </div>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-paper w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">{title}</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted mb-1 block">{label}</span>
      {children}
    </label>
  );
}
