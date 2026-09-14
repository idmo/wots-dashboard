"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CustomerPanel, type Customer, type NewCustomerDraft } from "@/components/register/CustomerPanel";
import { LineItemRow, emptyLineItem, type LineItemDraft } from "@/components/register/LineItemRow";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { formatCurrency } from "@/lib/utils";

let nextKey = 1;

export default function RegisterPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<NewCustomerDraft>({ name: "", email: "", phone: "" });
  const [items, setItems] = useState<LineItemDraft[]>([emptyLineItem(String(nextKey++))]);
  const [isPrepaid, setIsPrepaid] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.unitPrice) || 0) * i.quantity, 0),
    [items]
  );

  function updateItem(key: string, next: LineItemDraft) {
    setItems((prev) => prev.map((i) => (i.key === key ? next : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.key !== key) : prev));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyLineItem(String(nextKey++))]);
  }

  function resetForm() {
    setCustomer(null);
    setNewCustomer({ name: "", email: "", phone: "" });
    setItems([emptyLineItem(String(nextKey++))]);
    setIsPrepaid(false);
    setOrderNotes("");
  }

  const canSubmit =
    (customer || newCustomer.name.trim()) &&
    items.every((i) => i.title.trim() && i.author.trim() && i.binding) &&
    items.length > 0;

  async function submitOrder() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer?.id,
          customer: customer
            ? undefined
            : { name: newCustomer.name, email: newCustomer.email, phone: newCustomer.phone },
          isPrepaid,
          notes: orderNotes,
          items: items.map((i) => ({
            title: i.title,
            author: i.author,
            binding: i.binding,
            isbn13: i.isbn13 || undefined,
            thumbnailUrl: i.thumbnailUrl || undefined,
            genre: i.genre || undefined,
            unitPrice: Number(i.unitPrice) || 0,
            quantity: i.quantity,
            isPreorder: i.isPreorder,
            notes: i.notes || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ? JSON.stringify(data.error) : "Failed to submit order");
      }
      const data = await res.json();
      setSuccessOrderId(data.order.id);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Special Order</h1>
          <p className="text-sm text-stone-500">Word on the Street Books — register</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/dashboard" className="font-medium text-stone-500 underline underline-offset-2">
            Back office →
          </Link>
          <LogoutButton className="text-stone-400 underline underline-offset-2" />
        </div>
      </header>

      {successOrderId && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-800">
          <p>Order #{successOrderId} created.</p>
          <button className="text-sm underline" onClick={() => setSuccessOrderId(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-5">
        <CustomerPanel
          selected={customer}
          onSelect={setCustomer}
          newCustomer={newCustomer}
          onNewCustomerChange={setNewCustomer}
        />

        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold">Books</h2>
            <Button size="md" variant="secondary" onClick={addItem}>
              + Add book
            </Button>
          </CardHeader>
          <CardBody className="space-y-3">
            {items.map((item) => (
              <LineItemRow
                key={item.key}
                item={item}
                onChange={(next) => updateItem(item.key, next)}
                onRemove={() => removeItem(item.key)}
              />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-600"
                checked={isPrepaid}
                onChange={(e) => setIsPrepaid(e.target.checked)}
              />
              Customer paid up front (Prepaid)
            </label>

            <textarea
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-stone-900 focus:outline-none"
              placeholder="Order notes (e.g. “Customer paid deposit at register”, “Call on arrival”)"
              rows={2}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />

            <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-lg font-semibold">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              size="lg"
              className="w-full"
              disabled={!canSubmit || submitting}
              onClick={submitOrder}
            >
              {submitting ? "Submitting…" : "Submit order"}
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
