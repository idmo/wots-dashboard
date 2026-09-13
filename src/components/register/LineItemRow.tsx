"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export type LineItemDraft = {
  key: string;
  title: string;
  author: string;
  binding: "Paperback" | "Hardcover" | "";
  isbn13: string;
  thumbnailUrl: string;
  genre: string;
  unitPrice: string;
  quantity: number;
  isPreorder: boolean;
  notes: string;
  lookupStatus: "idle" | "loading" | "done" | "miss" | "error";
};

export function emptyLineItem(key: string): LineItemDraft {
  return {
    key,
    title: "",
    author: "",
    binding: "",
    isbn13: "",
    thumbnailUrl: "",
    genre: "",
    unitPrice: "",
    quantity: 1,
    isPreorder: false,
    notes: "",
    lookupStatus: "idle",
  };
}

export function LineItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: LineItemDraft;
  onChange: (next: LineItemDraft) => void;
  onRemove: () => void;
}) {
  const lastLookupKey = useRef<string>("");
  const [priceCopied, setPriceCopied] = useState(false);

  async function copyPrice() {
    if (!item.unitPrice) return;
    try {
      await navigator.clipboard.writeText(item.unitPrice);
      setPriceCopied(true);
      setTimeout(() => setPriceCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (permissions, non-HTTPS); the
      // price is still visible in the field for the cashier to type manually.
    }
  }

  // Asynchronous background metadata lookup (PRD 3.2): fires once Title,
  // Author, and Binding are all present, and never blocks the cashier from
  // continuing to type or add more line items.
  useEffect(() => {
    if (!item.title || !item.author || !item.binding) return;
    const lookupKey = `${item.title}|${item.author}|${item.binding}`;
    if (lookupKey === lastLookupKey.current) return;

    const controller = new AbortController();
    const t = setTimeout(async () => {
      lastLookupKey.current = lookupKey;
      onChange({ ...item, lookupStatus: "loading" });
      try {
        const res = await fetch(
          `/api/books/lookup?title=${encodeURIComponent(item.title)}&author=${encodeURIComponent(item.author)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!data.result) {
          onChange({ ...item, lookupStatus: "miss" });
          return;
        }
        onChange({
          ...item,
          isbn13: item.isbn13 || data.result.isbn13 || "",
          thumbnailUrl: item.thumbnailUrl || data.result.thumbnailUrl || "",
          genre: item.genre || data.result.genre || "",
          lookupStatus: "done",
        });
      } catch {
        onChange({ ...item, lookupStatus: "error" });
      }
    }, 500);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.title, item.author, item.binding]);

  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <div className="flex gap-3">
        <div className="flex h-20 w-14 flex-none items-center justify-center overflow-hidden rounded bg-stone-100 text-[10px] text-stone-400">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : item.lookupStatus === "loading" ? (
            "Looking up…"
          ) : (
            "No cover"
          )}
        </div>

        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none sm:col-span-2"
            placeholder="Title *"
            value={item.title}
            onChange={(e) => onChange({ ...item, title: e.target.value })}
          />
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="Author *"
            value={item.author}
            onChange={(e) => onChange({ ...item, author: e.target.value })}
          />
          <select
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            value={item.binding}
            onChange={(e) => onChange({ ...item, binding: e.target.value as LineItemDraft["binding"] })}
          >
            <option value="">Binding *</option>
            <option value="Paperback">Paperback</option>
            <option value="Hardcover">Hardcover</option>
          </select>
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="ISBN (optional)"
            value={item.isbn13}
            onChange={(e) => onChange({ ...item, isbn13: e.target.value })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="touch-target min-w-[90px] flex-1 rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
              placeholder="Price"
              inputMode="decimal"
              value={item.unitPrice}
              onChange={(e) => onChange({ ...item, unitPrice: e.target.value })}
            />
            <Button
              type="button"
              variant="secondary"
              className="flex-none px-2 py-2 text-xs"
              disabled={!item.unitPrice}
              onClick={copyPrice}
            >
              {priceCopied ? "Copied!" : "Copy for Square"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-stone-600">Qty</label>
            <input
              type="number"
              min={1}
              className="touch-target w-20 rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
              value={item.quantity}
              onChange={(e) => onChange({ ...item, quantity: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-purple-700">
            <input
              type="checkbox"
              className="h-5 w-5 accent-purple-600"
              checked={item.isPreorder}
              onChange={(e) => onChange({ ...item, isPreorder: e.target.checked })}
            />
            Preorder (not yet released)
          </label>
        </div>

        <Button variant="ghost" className="flex-none self-start text-red-600 hover:bg-red-50" onClick={onRemove}>
          Remove
        </Button>
      </div>

      {item.lookupStatus === "loading" && (
        <p className="mt-2 text-xs text-stone-400">Looking up cover & ISBN in the background…</p>
      )}
      {item.lookupStatus === "miss" && (
        <p className="mt-2 text-xs text-stone-400">No catalog match — manual entry will be used.</p>
      )}
    </div>
  );
}
