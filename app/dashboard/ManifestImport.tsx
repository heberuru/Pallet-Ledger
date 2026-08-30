"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { X, Upload, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ParsedRow = Record<string, any>;

const NAME_HINTS = ["item description", "item title", "description", "title", "product", "item"];
const QTY_HINTS = ["quantity", "qty", "units"];
const RETAIL_HINTS = ["unit retail", "retail price", "unit retail price", "retail", "msrp", "price"];
const CATEGORY_HINTS = ["category", "department", "sub-category", "subcategory"];

function guessColumn(headers: string[], hints: string[]): string {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const hint of hints) {
    const idx = lower.findIndex((h) => h === hint);
    if (idx !== -1) return headers[idx];
  }
  for (const hint of hints) {
    const idx = lower.findIndex((h) => h.includes(hint));
    if (idx !== -1) return headers[idx];
  }
  return "";
}

export default function ManifestImport({
  businessId,
  existingLots,
  onClose,
  onImported,
}: {
  businessId: string;
  existingLots: string[];
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "map" | "importing" | "done">("upload");
  const [error, setError] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [nameCol, setNameCol] = useState("");
  const [qtyCol, setQtyCol] = useState("");
  const [retailCol, setRetailCol] = useState("");
  const [categoryCol, setCategoryCol] = useState("");
  const [lot, setLot] = useState(() => {
    // Suggest a unique pallet name so every import is separated by default,
    // even if the person doesn't think to name it themselves.
    let n = existingLots.length + 1;
    let candidate = `Pallet ${n}`;
    while (existingLots.includes(candidate)) {
      n += 1;
      candidate = `Pallet ${n}`;
    }
    return candidate;
  });
  const [totalCost, setTotalCost] = useState("");
  const [importedCount, setImportedCount] = useState(0);

  function handleFile(file: File) {
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: "" });
        if (json.length === 0) {
          setError("Couldn't find any rows in that file.");
          return;
        }
        const foundHeaders = Object.keys(json[0]);
        setHeaders(foundHeaders);
        setRows(json);
        setNameCol(guessColumn(foundHeaders, NAME_HINTS));
        setQtyCol(guessColumn(foundHeaders, QTY_HINTS));
        setRetailCol(guessColumn(foundHeaders, RETAIL_HINTS));
        setCategoryCol(guessColumn(foundHeaders, CATEGORY_HINTS));
        setStep("map");
      } catch (err) {
        setError("Couldn't read that file. Make sure it's the .xlsx or .csv B-Stock gave you.");
      }
    };
    reader.readAsBinaryString(file);
  }

  const parsedItems = rows
    .map((r) => {
      const name = String(r[nameCol] ?? "").trim();
      const qty = Math.max(1, parseInt(String(r[qtyCol] ?? "1"), 10) || 1);
      const retail = parseFloat(String(r[retailCol] ?? "0").replace(/[^0-9.]/g, "")) || 0;
      const category = categoryCol ? String(r[categoryCol] ?? "").trim() || null : null;
      return { name, qty, retail, category };
    })
    .filter((r) => r.name);

  const totalUnits = parsedItems.reduce((s, r) => s + r.qty, 0);
  const totalRetailValue = parsedItems.reduce((s, r) => s + r.retail * r.qty, 0);
  const cost = parseFloat(totalCost) || 0;

  function allocatedUnitCost(retail: number) {
    if (totalRetailValue <= 0) return totalUnits > 0 ? cost / totalUnits : 0;
    return (retail / totalRetailValue) * cost;
  }

  async function runImport() {
    setStep("importing");
    setError("");

    const toInsert: any[] = [];
    const lotLabel = lot.trim() || `Import ${new Date().toISOString().slice(0, 10)}`;
    for (const r of parsedItems) {
      const unitCost = allocatedUnitCost(r.retail);
      for (let i = 0; i < r.qty; i++) {
        toInsert.push({
          business_id: businessId,
          name: r.name,
          lot: lotLabel,
          category: r.category,
          purchase_cost: Math.round(unitCost * 100) / 100,
          retail_price: r.retail,
          date_acquired: new Date().toISOString().slice(0, 10),
        });
      }
    }

    // Insert in batches so very large manifests don't hit request-size limits
    const BATCH = 200;
    try {
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const { error } = await supabase.from("items").insert(batch);
        if (error) throw error;
      }
      setImportedCount(toInsert.length);
      setStep("done");
      onImported(toInsert.length);
    } catch (e) {
      setError("Something went wrong partway through the import. Check the item list — you may need to re-import the rest.");
      setStep("map");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-paper w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">Import manifest</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="text-sm bg-[#F5E1DE] border border-rust text-rust rounded-lg px-3 py-2 mb-3">{error}</div>
        )}

        {step === "upload" && (
          <div>
            <p className="text-sm text-[#5b5647] mb-4">
              Upload the manifest spreadsheet B-Stock gives you when you win a bid (.xlsx, .xls, or .csv). Every
              line item becomes an item in your ledger automatically, kept separate from your other pallets.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[3/1] rounded-xl border-2 border-dashed border-input flex flex-col items-center justify-center gap-1 text-muted"
            >
              <Upload size={22} />
              <span className="text-sm font-medium">Choose file</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Match your columns</p>
              <div className="space-y-2">
                <ColumnSelect label="Item name / description" headers={headers} value={nameCol} onChange={setNameCol} />
                <ColumnSelect label="Quantity" headers={headers} value={qtyCol} onChange={setQtyCol} />
                <ColumnSelect label="Unit retail price" headers={headers} value={retailCol} onChange={setRetailCol} />
                <ColumnSelect label="Category (optional)" headers={headers} value={categoryCol} onChange={setCategoryCol} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-muted mb-1 block">Pallet name</span>
                <input className="field-input" placeholder="e.g. BTK-4471" value={lot} onChange={(e) => setLot(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted mb-1 block">Total you paid</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="field-input"
                  placeholder="0.00"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                />
              </label>
            </div>

            <div className="bg-white border border-line rounded-lg p-3 text-xs text-[#5b5647] space-y-1">
              <p>
                <b>{parsedItems.length}</b> line items · <b>{totalUnits}</b> total units · retail value{" "}
                <b>${totalRetailValue.toFixed(2)}</b>
              </p>
              <p className="text-muted">
                Your cost is split across items in proportion to their retail price, so pricier items carry more
                of what you paid.
              </p>
            </div>

            {nameCol && qtyCol && (
              <div className="max-h-48 overflow-y-auto border border-line rounded-lg divide-y divide-line bg-white">
                {parsedItems.slice(0, 50).map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="truncate flex-1">{r.name} {r.qty > 1 ? `×${r.qty}` : ""}</span>
                    <span className="text-muted flex-shrink-0 ml-2">
                      ${allocatedUnitCost(r.retail).toFixed(2)}/unit
                    </span>
                  </div>
                ))}
                {parsedItems.length > 50 && (
                  <div className="px-3 py-1.5 text-xs text-muted">…and {parsedItems.length - 50} more</div>
                )}
              </div>
            )}

            <button
              onClick={runImport}
              disabled={!nameCol || !qtyCol || totalUnits === 0}
              className="w-full bg-ink text-cream font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Import {totalUnits > 0 ? `${totalUnits} items` : ""} <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-sm">Importing your manifest…</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-8">
            <p className="text-lg font-semibold mb-1">Done!</p>
            <p className="text-sm text-muted mb-5">
              Added {importedCount} items to <b>{lot.trim() || "this pallet"}</b>. Add photos from the item
              detail view when you're ready.
            </p>
            <button onClick={onClose} className="bg-ink text-cream font-semibold py-2.5 px-6 rounded-xl">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnSelect({
  label,
  headers,
  value,
  onChange,
}: {
  label: string;
  headers: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-[#5b5647] flex-shrink-0">{label}</span>
      <select className="field-input max-w-[55%]" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}
