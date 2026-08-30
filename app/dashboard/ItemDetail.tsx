"use client";

import { useRef, useState } from "react";
import { X, Plus, Trash2, ExternalLink, Loader2, ImageIcon, Video as VideoIcon, Link as LinkIcon, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Media = {
  id: string;
  item_id: string;
  business_id: string;
  url: string;
  storage_path: string;
  type: "photo" | "video" | "retail_photo";
  position: number;
};

export type DetailItem = {
  id: string;
  name: string;
  lot: string | null;
  category: string | null;
  purchase_cost: number;
  retail_price: number;
  retail_url: string | null;
  affiliate_url: string | null;
  date_acquired?: string;
};

const fmt = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function ItemDetail({
  businessId,
  item,
  media,
  onClose,
  onMediaChange,
  onItemChange,
}: {
  businessId: string;
  item: DetailItem;
  media: Media[];
  onClose: () => void;
  onMediaChange: (next: Media[]) => void;
  onItemChange: (next: DetailItem) => void;
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<"details" | "photos" | "video" | "retail">("details");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [retailPrice, setRetailPrice] = useState(String(item.retail_price || ""));
  const [retailUrl, setRetailUrl] = useState(item.retail_url || "");
  const [affiliateUrl, setAffiliateUrl] = useState(item.affiliate_url || "");
  const [savingRetail, setSavingRetail] = useState(false);

  const [name, setName] = useState(item.name);
  const [lot, setLot] = useState(item.lot || "");
  const [category, setCategory] = useState(item.category || "");
  const [purchaseCost, setPurchaseCost] = useState(String(item.purchase_cost ?? ""));
  const [savingDetails, setSavingDetails] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const retailPhotoInputRef = useRef<HTMLInputElement>(null);

  const photos = media.filter((m) => m.type === "photo").sort((a, b) => a.position - b.position);
  const video = media.find((m) => m.type === "video");
  const retailPhotos = media.filter((m) => m.type === "retail_photo").sort((a, b) => a.position - b.position);

  async function uploadFile(file: File, type: "photo" | "video" | "retail_photo") {
    setError("");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg");
      const path = `${businessId}/${item.id}/${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("item-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("item-media").getPublicUrl(path);

      const { data, error: insertError } = await supabase
        .from("item_media")
        .insert({
          item_id: item.id,
          business_id: businessId,
          url: publicUrlData.publicUrl,
          storage_path: path,
          type,
          position: type === "photo" ? photos.length : type === "retail_photo" ? retailPhotos.length : 0,
        })
        .select()
        .single();

      if (insertError || !data) throw insertError || new Error("Insert failed");

      onMediaChange([...media, data as Media]);
    } catch (e: any) {
      if (type === "photo" && photos.length >= 10) {
        setError("You've hit the 10-photo limit for this item.");
      } else if (type === "retail_photo" && retailPhotos.length >= 5) {
        setError("You've hit the 5-photo limit for retail comparison photos.");
      } else if (type === "video" && video) {
        setError("This item already has a video. Remove it first to add a new one.");
      } else {
        setError("Upload failed. Try a smaller file or check your connection.");
      }
    } finally {
      setUploading(false);
    }
  }

  async function removeMedia(m: Media) {
    setError("");
    const { error: storageError } = await supabase.storage.from("item-media").remove([m.storage_path]);
    if (storageError) {
      setError("Couldn't remove the file. Try again.");
      return;
    }
    const { error: dbError } = await supabase.from("item_media").delete().eq("id", m.id);
    if (dbError) {
      setError("Couldn't remove the file. Try again.");
      return;
    }
    onMediaChange(media.filter((x) => x.id !== m.id));
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setError("");
    const { data, error } = await supabase
      .from("items")
      .update({
        name: name.trim(),
        lot: lot.trim() || null,
        category: category.trim() || null,
        purchase_cost: parseFloat(purchaseCost) || 0,
      })
      .eq("id", item.id)
      .select()
      .single();
    setSavingDetails(false);
    if (error || !data) {
      setError("Couldn't save those changes. Try again.");
      return;
    }
    onItemChange(data as DetailItem);
  }

  async function saveRetail(e: React.FormEvent) {
    e.preventDefault();
    setSavingRetail(true);
    setError("");
    const { data, error } = await supabase
      .from("items")
      .update({
        retail_price: parseFloat(retailPrice) || 0,
        retail_url: retailUrl.trim() || null,
        affiliate_url: affiliateUrl.trim() || null,
      })
      .eq("id", item.id)
      .select()
      .single();
    setSavingRetail(false);
    if (error || !data) {
      setError("Couldn't save the retail info. Try again.");
      return;
    }
    onItemChange(data as DetailItem);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-paper w-full sm:w-[460px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold uppercase tracking-wide truncate">{item.name}</h2>
            {item.lot && <p className="text-xs text-muted">Lot {item.lot}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="flex-shrink-0 ml-2">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <TabButton active={tab === "details"} onClick={() => setTab("details")} icon={<Pencil size={14} />}>
            Details
          </TabButton>
          <TabButton active={tab === "photos"} onClick={() => setTab("photos")} icon={<ImageIcon size={14} />}>
            Photos ({photos.length}/10)
          </TabButton>
          <TabButton active={tab === "video"} onClick={() => setTab("video")} icon={<VideoIcon size={14} />}>
            Video {video ? "(1/1)" : "(0/1)"}
          </TabButton>
          <TabButton active={tab === "retail"} onClick={() => setTab("retail")} icon={<LinkIcon size={14} />}>
            Retail link
          </TabButton>
        </div>

        {error && (
          <div className="text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2 mb-3">{error}</div>
        )}

        {tab === "details" && (
          <form onSubmit={saveDetails} className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">Item name</span>
              <input required className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">Lot / pallet #</span>
              <input className="field-input" value={lot} onChange={(e) => setLot(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">Category</span>
              <input className="field-input" placeholder="e.g. Electronics" value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">Your cost</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="field-input"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={savingDetails}
              className="w-full bg-ink text-cream font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {savingDetails ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}

        {tab === "photos" && (
          <div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-cream border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeMedia(p)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                    aria-label="Remove photo"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {photos.length < 10 && (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-lg border-2 border-dashed border-input flex flex-col items-center justify-center gap-1 text-muted disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  <span className="text-[10px]">Add photo</span>
                </button>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f, "photo");
                e.target.value = "";
              }}
            />
            <p className="text-[11px] text-muted mt-2">
              Tap a tile to remove it. Up to 10 photos — your own shots or ones saved from the B-Stock listing.
            </p>
          </div>
        )}

        {tab === "video" && (
          <div>
            {video ? (
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video src={video.url} controls className="w-full max-h-72" />
                <button
                  onClick={() => removeMedia(video)}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"
                  aria-label="Remove video"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-input flex flex-col items-center justify-center gap-1 text-muted disabled:opacity-50"
              >
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                <span className="text-xs">Add a video</span>
              </button>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f, "video");
                e.target.value = "";
              }}
            />
            <p className="text-[11px] text-muted mt-2">One video per item. Keep it under ~50MB for a fast upload.</p>
          </div>
        )}

        {tab === "retail" && (
          <form onSubmit={saveRetail} className="space-y-3">
            <p className="text-xs text-muted -mt-1">
              Link the same item on the retailer's site so anyone viewing this listing can see what it costs new.
            </p>
            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">Retail price (new)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="field-input"
                placeholder="0.00"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">Retailer link</span>
              <input
                type="url"
                className="field-input"
                placeholder="https://www.amazon.com/..."
                value={retailUrl}
                onChange={(e) => setRetailUrl(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted mb-1 block">
                Affiliate link <span className="font-normal text-muted">(optional — used instead of the retailer link above when set)</span>
              </span>
              <input
                type="url"
                className="field-input"
                placeholder="Paste your affiliate/tracking link"
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={savingRetail}
              className="w-full bg-ink text-cream font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {savingRetail ? "Saving…" : "Save retail info"}
            </button>
            {(item.affiliate_url || item.retail_url) && (
              <a
                href={item.affiliate_url || item.retail_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink underline"
              >
                View current listing <ExternalLink size={13} />
              </a>
            )}

            <div className="pt-2 border-t border-line">
              <span className="text-xs font-medium text-muted mb-2 block">
                Retail photos ({retailPhotos.length}/5) — screenshots or product photos from the retailer's page
              </span>
              <div className="grid grid-cols-3 gap-2">
                {retailPhotos.map((p) => (
                  <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-cream border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeMedia(p)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                      aria-label="Remove retail photo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {retailPhotos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => retailPhotoInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-lg border-2 border-dashed border-input flex flex-col items-center justify-center gap-1 text-muted disabled:opacity-50"
                  >
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    <span className="text-[10px]">Add</span>
                  </button>
                )}
              </div>
              <input
                ref={retailPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f, "retail_photo");
                  e.target.value = "";
                }}
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? "bg-ink text-cream border-ink" : "bg-white text-ink border-input"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
