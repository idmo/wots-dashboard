import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { PrintButton } from "@/components/pickup-slip/PrintButton";

// Hold-shelf pickup slip (PRD 7.5/7.6): a single-page printout meant to go
// inside the book while it sits on the shelf, so any staff member can tell
// at a glance who it's for and when the hold expires. Deliberately lives
// outside the /dashboard layout (no sidebar/nav) so printing doesn't pick
// up anything but the slip itself.
export const dynamic = "force-dynamic";

export default async function PickupSlipPage({ params }: PageProps<"/pickup-slip/[itemId]">) {
  const { itemId } = await params;

  const item = await db.query.orderItems.findFirst({
    where: eq(schema.orderItems.id, Number(itemId)),
    with: { book: true, order: { with: { customer: true } } },
  });

  if (!item) notFound();

  const { order, book } = item;

  return (
    <div className="mx-auto max-w-md p-6 print:max-w-none print:p-0">
      <style>{"@page { size: auto; margin: 0.75in; }"}</style>

      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/dashboard/orders/${order.id}`} className="text-sm text-stone-500 underline">
          ← Back to order #{order.id}
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-stone-300 p-6 print:border-0 print:p-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Word on the Street Books — Hold Shelf
        </p>

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-stone-400">Customer</p>
        <p className="text-3xl font-bold">{order.customer.name}</p>

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-stone-400">Book</p>
        <p className="text-2xl font-semibold">{book.title}</p>
        <p className="text-sm text-stone-500">
          {book.binding}
          {item.quantity > 1 ? ` · Qty ${item.quantity}` : ""}
          {book.isbn13 ? ` · ISBN ${book.isbn13}` : ""}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-stone-200 pt-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Notified</p>
            <p className="text-lg font-medium">
              {item.notificationDate ? formatDateTime(item.notificationDate) : "Not yet notified"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Pickup by</p>
            <p className="text-lg font-medium">
              {order.isPrepaid
                ? "No deadline (prepaid)"
                : item.expirationDate
                  ? formatDateTime(item.expirationDate)
                  : "Not yet calculated"}
            </p>
          </div>
        </div>

        <p className="mt-6 text-xs text-stone-400">
          Order #{order.id}
          {order.customer.phone ? ` · ${order.customer.phone}` : ""}
        </p>
      </div>
    </div>
  );
}
