import { cx } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  LINE_ITEM_STATUS_LABELS,
  type OrderStatus,
  type LineItemStatus,
} from "@/lib/domain/status";

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-stone-100 text-stone-700",
  submitted_to_supplier: "bg-blue-100 text-blue-800",
  partially_received: "bg-amber-100 text-amber-800",
  ready_for_pickup: "bg-emerald-100 text-emerald-800",
  completed: "bg-stone-900 text-white",
  cancelled: "bg-red-100 text-red-700",
};

const LINE_ITEM_STATUS_COLORS: Record<LineItemStatus, string> = {
  pending: "bg-stone-100 text-stone-700",
  approved: "bg-indigo-100 text-indigo-800",
  ordered: "bg-blue-100 text-blue-800",
  backordered: "bg-amber-100 text-amber-800",
  received: "bg-teal-100 text-teal-800",
  fulfilled: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        ORDER_STATUS_COLORS[status]
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function LineItemStatusBadge({ status }: { status: LineItemStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        LINE_ITEM_STATUS_COLORS[status]
      )}
    >
      {LINE_ITEM_STATUS_LABELS[status]}
    </span>
  );
}

export function PreorderPrepaidTags({
  isPreorder,
  isPrepaid,
}: {
  isPreorder: boolean;
  isPrepaid: boolean;
}) {
  if (!isPreorder && !isPrepaid) return null;
  return (
    <span className="inline-flex gap-1">
      {isPreorder && (
        <span className="rounded-full border border-purple-400 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
          Preorder
        </span>
      )}
      {isPrepaid && (
        <span className="rounded-full border border-emerald-500 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          Prepaid
        </span>
      )}
    </span>
  );
}
