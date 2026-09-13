"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// Preorder/prepaid items often get added with a placeholder $0 price at
// register time (the exact published price isn't always known yet). This
// widget helps staff pin down the real price before the customer is
// charged: a "Look up price" link opens a prefilled web search in a new
// tab (no live price API is connected — Ingram is mocked, stock only), a
// small field to type the price in, and a "Copy for Square" button so the
// number can be pasted straight into Square's variable-price item entry.
export function PriceLookup({
  itemId,
  title,
  isbn13,
  initialPrice,
  onSaved,
}: {
  itemId: number;
  title: string;
  isbn13: string | null;
  initialPrice: string;
  onSaved?: () => void;
}) {
  const [price, setPrice] = useState(initialPrice);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const searchTerm = isbn13 || title;
  const searchUrl = `https://bookshop.org/search?keywords=${encodeURIComponent(searchTerm)}`;

  async function save() {
    const parsed = Number(price);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setSaving(true);
    setSaved(false);
    await fetch(`/api/order-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitPrice: parsed }),
    });
    setSaving(false);
    setSaved(true);
    onSaved?.();
    setTimeout(() => setSaved(false), 1500);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(price);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (permissions, non-HTTPS); the
      // price is still visible in the field for staff to type manually.
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-2 text-xs">
      <span className="font-medium text-amber-800">Published price:</span>
      <a
        href={searchUrl}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-blue-700 underline"
      >
        Look up ↗
      </a>
      <span className="text-stone-300">|</span>
      <span className="text-stone-500">$</span>
      <input
        className="w-20 rounded border border-stone-300 px-2 py-1 text-sm"
        inputMode="decimal"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <Button size="md" variant="secondary" disabled={saving} onClick={save} className="px-2 py-1 text-xs">
        {saved ? "Saved" : "Save"}
      </Button>
      <Button size="md" variant="ghost" onClick={copy} className="px-2 py-1 text-xs">
        {copied ? "Copied!" : "Copy for Square"}
      </Button>
    </div>
  );
}
