// Order & line-item status pipelines, per PRD section 4.

export const ORDER_STATUSES = [
  "pending",
  "submitted_to_supplier",
  "partially_received",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  submitted_to_supplier: "Submitted to Supplier",
  partially_received: "Partially Received",
  ready_for_pickup: "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending: "Order created at register; awaiting inventory review or supplier placement.",
  submitted_to_supplier: "Order placed with distributor (e.g., Ingram, Baker & Taylor).",
  partially_received: "Some line items arrived in store; others remain outstanding.",
  ready_for_pickup: "All items received; customer notified via email/SMS.",
  completed: "Customer picked up items and completed purchase.",
  cancelled: "Order cancelled by customer or bookstore.",
};

export const LINE_ITEM_STATUSES = [
  "pending",
  "approved",
  "ordered",
  "backordered",
  "received",
  "fulfilled",
  "cancelled",
] as const;

export type LineItemStatus = (typeof LINE_ITEM_STATUSES)[number];

export const LINE_ITEM_STATUS_LABELS: Record<LineItemStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  ordered: "Ordered",
  backordered: "Backordered",
  received: "Received",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export const LINE_ITEM_STATUS_DESCRIPTIONS: Record<LineItemStatus, string> = {
  pending: "Item added to order; awaiting cashier or manager approval.",
  approved:
    "Preorders, prepaid items, or cashier-approved orders validated for PO generation. Skips Pending state.",
  ordered: "Item successfully placed on distributor purchase order.",
  backordered: "Item temporarily out of stock at distributor; delayed fulfillment.",
  received: "Item delivered to store and checked into hold shelf.",
  fulfilled: "Item handed over to customer.",
  cancelled: "Line item cancelled (out of print or customer request).",
};

// Pending -> Approved -> Ordered -> Backordered -> Received -> Fulfilled / Cancelled
export const LINE_ITEM_PIPELINE_ORDER: LineItemStatus[] = [
  "pending",
  "approved",
  "ordered",
  "backordered",
  "received",
  "fulfilled",
];

/** Legal next states for a line item, from its current state. */
export function nextLineItemStatuses(current: LineItemStatus): LineItemStatus[] {
  switch (current) {
    case "pending":
      return ["approved", "cancelled"];
    case "approved":
      return ["ordered", "cancelled"];
    case "ordered":
      return ["backordered", "received", "cancelled"];
    case "backordered":
      return ["ordered", "received", "cancelled"];
    case "received":
      return ["fulfilled", "cancelled"];
    case "fulfilled":
    case "cancelled":
      return [];
  }
}

/** Derives the top-level order status by rolling up its line items' statuses. */
export function deriveOrderStatus(lineItemStatuses: LineItemStatus[]): OrderStatus {
  if (lineItemStatuses.length === 0) return "pending";
  const active = lineItemStatuses.filter((s) => s !== "cancelled");
  if (active.length === 0) return "cancelled";

  if (active.every((s) => s === "fulfilled")) return "completed";
  if (active.every((s) => s === "received" || s === "fulfilled")) return "ready_for_pickup";
  if (active.some((s) => s === "received" || s === "fulfilled")) return "partially_received";
  if (active.every((s) => s === "pending")) return "pending";
  return "submitted_to_supplier";
}

export const PREORDER_HIGHLIGHT_CLASS = "highlight-preorder";
export const PREPAID_HIGHLIGHT_CLASS = "highlight-prepaid";

/** Returns the Tailwind/utility class(es) for row/card highlighting per PRD 4.2. */
export function highlightClassFor(opts: { isPreorder: boolean; isPrepaid: boolean }): string {
  if (opts.isPreorder && opts.isPrepaid) return "highlight-preorder-prepaid";
  if (opts.isPreorder) return PREORDER_HIGHLIGHT_CLASS;
  if (opts.isPrepaid) return PREPAID_HIGHLIGHT_CLASS;
  return "";
}
