"use client";

// PO Pipeline (PRD 7.3): three views over the same flattened line-item
// list — a status Kanban (click-to-advance), a sortable/filterable table
// for bulk status changes, and a read-only "rekey" filter of Approved
// items for manually rekeying into Basil POS/PO. Kanban card titles link
// out to the printable hold-shelf pickup slip (/pickup-slip/[itemId]).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LineItemStatusBadge, PreorderPrepaidTags } from "@/components/ui/StatusBadge";
import { formatCurrency, cx } from "@/lib/utils";
import {
  LINE_ITEM_PIPELINE_ORDER,
  LINE_ITEM_STATUS_LABELS,
  LINE_ITEM_STATUSES,
  nextLineItemStatuses,
  type LineItemStatus,
} from "@/lib/domain/status";
import type { IngramStockResult } from "@/lib/services/ingram";

type FlatItem = {
  id: number;
  orderId: number;
  customerName: string;
  title: string;
  isbn13: string | null;
  quantity: number;
  subtotal: string;
  status: LineItemStatus;
  isPreorder: boolean;
  isPrepaid: boolean;
};

type Tab = "kanban" | "table" | "rekey";
type SortKey = "orderId" | "title" | "status" | "quantity" | "subtotal";

const STATUS_SORT_ORDER: LineItemStatus[] = [...LINE_ITEM_PIPELINE_ORDER, "cancelled"];

export default function PipelinePage() {
  const [items, setItems] = useState<FlatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("kanban");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<LineItemStatus>("ordered");
  const [stock, setStock] = useState<Record<string, IngramStockResult>>({});
  const [sortKey, setSortKey] = useState<SortKey>("orderId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<Set<LineItemStatus>>(
    () => new Set(LINE_ITEM_STATUSES)
  );

  async function fetchItems(): Promise<FlatItem[]> {
    const res = await fetch("/api/orders");
    const data = await res.json();
    const flat: FlatItem[] = [];
    for (const order of data.orders ?? []) {
      for (const item of order.items) {
        flat.push({
          id: item.id,
          orderId: order.id,
          customerName: order.customer.name,
          title: item.book.title,
          isbn13: item.book.isbn13,
          quantity: item.quantity,
          subtotal: item.subtotal,
          status: item.status,
          isPreorder: item.isPreorder,
          isPrepaid: order.isPrepaid,
        });
      }
    }
    return flat;
  }

  async function load() {
    setItems(await fetchItems());
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;
    fetchItems().then((flat) => {
      if (!ignore) {
        setItems(flat);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const approvedItems = useMemo(() => items.filter((i) => i.status === "approved"), [items]);

  // Clicking the active column again flips direction; clicking a different
  // column switches to it, always starting ascending.
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // statusFilter starts with every status checked (i.e. no filtering);
  // unchecking a status chip hides those rows from the sortable table.
  function toggleStatusFilter(status: LineItemStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  // Applies the status filter, then sorts by whichever column/direction is
  // active — recomputed only when the underlying data or the sort/filter
  // state actually changes.
  const tableItems = useMemo(() => {
    const filtered = items.filter((i) => statusFilter.has(i.status));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "orderId":
          cmp = a.orderId - b.orderId;
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = STATUS_SORT_ORDER.indexOf(a.status) - STATUS_SORT_ORDER.indexOf(b.status);
          break;
        case "quantity":
          cmp = a.quantity - b.quantity;
          break;
        case "subtotal":
          cmp = Number(a.subtotal) - Number(b.subtotal);
          break;
      }
      return cmp * dir;
    });
  }, [items, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    if (tab !== "rekey" || approvedItems.length === 0) return;
    const isbns = approvedItems.map((i) => i.isbn13).filter((v): v is string => Boolean(v));
    if (isbns.length === 0) return;
    fetch("/api/ingram/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isbns }),
    })
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, IngramStockResult> = {};
        for (const r of data.results ?? []) map[r.isbn13] = r;
        setStock(map);
      });
  }, [tab, approvedItems]);

  async function moveItem(itemId: number, status: LineItemStatus) {
    await fetch(`/api/order-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function applyBulk() {
    if (selected.size === 0) return;
    await fetch("/api/order-items/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemIds: Array.from(selected), status: bulkStatus }),
    });
    setSelected(new Set());
    load();
  }

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">PO Pipeline</h1>
        <p className="text-sm text-stone-500">Kanban, sortable table, and PO rekeying views — PRD 7.3</p>
      </header>

      <div className="flex gap-2 border-b border-stone-200">
        {(
          [
            ["kanban", "Kanban"],
            ["table", "Sortable table"],
            ["rekey", "PO rekeying filter"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cx(
              "px-3 py-2 text-sm font-medium",
              tab === value ? "border-b-2 border-stone-900 text-stone-900" : "text-stone-400"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : tab === "kanban" ? (
        <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-[220px]">
          {LINE_ITEM_PIPELINE_ORDER.map((status) => (
            <div key={status} className="min-w-[220px] rounded-lg bg-stone-100 p-2">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                {LINE_ITEM_STATUS_LABELS[status]} · {items.filter((i) => i.status === status).length}
              </p>
              <div className="space-y-2">
                {items
                  .filter((i) => i.status === status)
                  .map((item) => (
                    <Card key={item.id} className="text-xs">
                      <CardBody className="space-y-1 p-2">
                        <p className="font-medium">
                          <Link
                            href={`/pickup-slip/${item.id}`}
                            target="_blank"
                            className="hover:underline"
                            title="Print pickup slip"
                          >
                            {item.title}
                          </Link>
                        </p>
                        <p className="text-stone-400">
                          #{item.orderId} · {item.customerName}
                        </p>
                        <PreorderPrepaidTags isPreorder={item.isPreorder} isPrepaid={item.isPrepaid} />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {nextLineItemStatuses(item.status).map((s) => (
                            <button
                              key={s}
                              onClick={() => moveItem(item.id, s)}
                              className="rounded border border-stone-300 bg-white px-1.5 py-0.5 hover:bg-stone-50"
                            >
                              → {LINE_ITEM_STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : tab === "table" ? (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-stone-500">{selected.size} selected</span>
              <select
                className="touch-target rounded-lg border border-stone-300 px-3 text-sm"
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as LineItemStatus)}
              >
                {LINE_ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LINE_ITEM_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <Button size="md" variant="secondary" disabled={selected.size === 0} onClick={applyBulk}>
                Apply to selected
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Show statuses
              </span>
              {LINE_ITEM_STATUSES.map((s) => (
                <label
                  key={s}
                  className={cx(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                    statusFilter.has(s)
                      ? "border-stone-300 bg-stone-100 text-stone-700"
                      : "border-stone-200 bg-white text-stone-400"
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={statusFilter.has(s)}
                    onChange={() => toggleStatusFilter(s)}
                  />
                  {LINE_ITEM_STATUS_LABELS[s]}
                </label>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-xs uppercase text-stone-400">
                    <th className="py-2"></th>
                    <SortHeader label="Order" sortKey="orderId" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortHeader label="Title" sortKey="title" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortHeader
                      label="Qty"
                      sortKey="quantity"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      align="right"
                    />
                    <SortHeader
                      label="Subtotal"
                      sortKey="subtotal"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      align="right"
                    />
                  </tr>
                </thead>
                <tbody>
                  {tableItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-stone-400">
                        No line items match the selected statuses.
                      </td>
                    </tr>
                  )}
                  {tableItems.map((item) => (
                    <tr key={item.id} className="border-b border-stone-50">
                      <td className="py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selected.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                        />
                      </td>
                      <td className="py-2">
                        <Link href={`/dashboard/orders/${item.orderId}`} className="underline">
                          #{item.orderId}
                        </Link>
                      </td>
                      <td className="py-2">{item.title}</td>
                      <td className="py-2">
                        <LineItemStatusBadge status={item.status} />
                      </td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm text-stone-500">
              Approved line items only — for manual rekeying into Basil POS/PO.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-xs uppercase text-stone-400">
                    <th className="py-2">Order</th>
                    <th className="py-2">Title</th>
                    <th className="py-2">ISBN</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2">Ingram stock</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-stone-400">
                        Nothing awaiting rekeying.
                      </td>
                    </tr>
                  )}
                  {approvedItems.map((item) => {
                    const s = item.isbn13 ? stock[item.isbn13] : undefined;
                    return (
                      <tr key={item.id} className="border-b border-stone-50">
                        <td className="py-2">#{item.orderId}</td>
                        <td className="py-2">{item.title}</td>
                        <td className="py-2 text-stone-500">{item.isbn13 ?? "—"}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2">
                          {!item.isbn13 ? (
                            "—"
                          ) : s ? (
                            <span
                              className={cx(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                s.inStock ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              )}
                            >
                              {s.inStock ? `${s.quantityAvailable} in stock` : `~${s.estimatedRestockDays}d restock`}
                            </span>
                          ) : (
                            "Checking…"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// Clickable <th> for the sortable table: shows a ▲/▼ indicator only on
// the currently active column, otherwise a plain (dimmed) label.
function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === activeKey;
  return (
    <th className={cx("py-2", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cx(
          "inline-flex items-center gap-1 hover:text-stone-700",
          active ? "text-stone-700" : "text-stone-400"
        )}
      >
        {label}
        <span className="text-[10px]">{active ? (dir === "asc" ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );
}
