"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LineItemStatusBadge, OrderStatusBadge, PreorderPrepaidTags } from "@/components/ui/StatusBadge";
import { PriceLookup } from "@/components/dashboard/PriceLookup";
import { formatCurrency, formatDateTime, cx } from "@/lib/utils";
import {
  nextLineItemStatuses,
  LINE_ITEM_STATUS_LABELS,
  highlightClassFor,
  type LineItemStatus,
  type OrderStatus,
} from "@/lib/domain/status";

type OrderItem = {
  id: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  isPreorder: boolean;
  status: LineItemStatus;
  notificationDate: string | null;
  expirationDate: string | null;
  notes: string | null;
  book: { title: string; isbn13: string | null; binding: string };
};

type Order = {
  id: number;
  status: OrderStatus;
  isPrepaid: boolean;
  notes: string | null;
  createdAt: string;
  customer: { id: number; name: string; email: string | null; phone: string | null };
  items: OrderItem[];
};

export function OrderDetail({ order }: { order: Order }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyItemId, setBusyItemId] = useState<number | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function updateItemStatus(itemId: number, status: LineItemStatus) {
    setBusyItemId(itemId);
    await fetch(`/api/order-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyItemId(null);
    refresh();
  }

  async function notifyCustomer() {
    await fetch(`/api/orders/${order.id}/notify`, { method: "POST" });
    refresh();
  }

  async function extendDeadline(itemId: number) {
    const days = prompt("Extend pickup deadline by how many days?", "7");
    if (!days) return;
    await fetch(`/api/order-items/${itemId}/extend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extraDays: Number(days) }),
    });
    refresh();
  }

  const total = order.items.reduce((sum, i) => sum + Number(i.subtotal), 0);

  return (
    <div className={cx("space-y-4", isPending && "opacity-60")}>
      <Card>
        <CardBody className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Order #{order.id}
            </p>
            <p className="text-lg font-semibold">{order.customer.name}</p>
            <p className="text-sm text-stone-500">
              {[order.customer.email, order.customer.phone].filter(Boolean).join(" · ") || "No contact info"}
            </p>
            <p className="mt-1 text-xs text-stone-400">Created {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="text-right">
            <OrderStatusBadge status={order.status} />
            <p className="mt-2 text-2xl font-bold">{formatCurrency(total)}</p>
            {order.isPrepaid && (
              <span className="mt-1 inline-block rounded-full border border-emerald-500 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Prepaid
              </span>
            )}
          </div>
        </CardBody>
        {order.notes && (
          <CardBody className="border-t border-stone-100 text-sm text-stone-600">
            <span className="font-medium text-stone-500">Notes: </span>
            {order.notes}
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-semibold">Line items</h2>
          <Button size="md" variant="secondary" onClick={notifyCustomer}>
            Mark received items notified
          </Button>
        </CardHeader>
        <CardBody className="space-y-3">
          {order.items.map((item) => {
            const next = nextLineItemStatuses(item.status);
            return (
              <div
                key={item.id}
                className={cx(
                  "rounded-lg border p-3",
                  highlightClassFor({ isPreorder: item.isPreorder, isPrepaid: order.isPrepaid }) ||
                    "border-stone-200"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {item.book.title}{" "}
                      <span className="font-normal text-stone-400">
                        ({item.book.binding}) × {item.quantity}
                      </span>
                    </p>
                    <p className="text-xs text-stone-400">ISBN {item.book.isbn13 ?? "—"}</p>
                    <PreorderPrepaidTags isPreorder={item.isPreorder} isPrepaid={order.isPrepaid} />
                  </div>
                  <div className="text-right">
                    <LineItemStatusBadge status={item.status} />
                    <p className="mt-1 text-sm font-medium">{formatCurrency(item.subtotal)}</p>
                  </div>
                </div>

                {item.expirationDate && (
                  <p className="mt-2 text-xs text-stone-500">
                    Pickup deadline: {formatDateTime(item.expirationDate)}{" "}
                    <button className="underline" onClick={() => extendDeadline(item.id)}>
                      Extend
                    </button>
                  </p>
                )}

                {/* Preorder/prepaid items may have a placeholder $0 price
                    from the register — surface the price-lookup widget so
                    staff can pin down and save the real published price. */}
                {(item.isPreorder || order.isPrepaid) && (
                  <PriceLookup
                    itemId={item.id}
                    title={item.book.title}
                    isbn13={item.book.isbn13}
                    initialPrice={item.unitPrice}
                    onSaved={refresh}
                  />
                )}

                {next.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {next.map((s) => (
                      <button
                        key={s}
                        disabled={busyItemId === item.id}
                        onClick={() => updateItemStatus(item.id, s)}
                        className="touch-target rounded-lg border border-stone-300 bg-white px-3 text-xs font-medium hover:bg-stone-100 disabled:opacity-50"
                      >
                        Mark {LINE_ITEM_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
