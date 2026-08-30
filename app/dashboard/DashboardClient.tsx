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

  const stats = useMemo(() => {
    const invested = items.reduce((s, it) => s + (it.purchase_cost || 0), 0);
    const sold = items.filter((it) => it.status === "sold");
    const revenue = sold.reduce((s, it) => s + (it.sold_price || 0), 0);
    const soldCost = sold.reduce((s, it) => s + (it.purchase_cost || 0), 0);
    return {
      invested,
      revenue,
      profit: revenue - soldCost,
      inStock: items.filter((it) => it.status === "in_stock").length,
      sold: sold.length,
    };
  }, [items]);

  const visible = items.filter((it) => (filter === "all" ? true : it.status === filter));
  const detailItem = items.find((it) => it.id === detailItemId) || null;

  return (
    <div className="min-h-screen bg-cream text-ink pb-24">
      {/* Header */}
      <div className="bg-ink text-cream px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Boxes size={22} className="text-amber" />
            <h1 className="font-display text-2xl
