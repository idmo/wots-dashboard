import Link from "next/link";
import { eq, and, isNotNull, lt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LineItemStatusBadge } from "@/components/ui/StatusBadge";
import { PriceLookup } from "@/components/dashboard/PriceLookup";
import { formatDateTime } from "@/lib/utils";

// Hold shelf contents change constantly — never freeze this at build time.
export const dynamic = "force-dynamic";

// Hold Shelf & Inventory Management Views (PRD 7.6).
export default async function HoldShelfPage() {
  const receivedItems = await db.query.orderItems.findMany({
    where: eq(schema.orderItems.status, "received"),
    with: { book: true, order: { with: { customer: true } } },
  });

  const now = new Date();
  const expiredItems = await db.query.orderItems.findMany({
    where: and(isNotNull(schema.orderItems.expirationDate), lt(schema.orderItems.expirationDate, now)),
    with: { book: true, order: { with: { customer: true } } },
  });
  const unclaimedExpired = expiredItems.filter(
    (i) => i.status !== "fulfilled" && i.status !== "cancelled"
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Hold Shelf</h1>
        <p className="text-sm text-stone-500">Incoming deliveries and unclaimed holds — PRD 7.6</p>
      </header>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Incoming Deliveries / Set Aside</h2>
          <p className="text-xs text-stone-500">
            Newly received items to pull from shipments and place on the customer hold shelf, then notify.
          </p>
        </CardHeader>
        <CardBody className="space-y-2">
          {receivedItems.length === 0 && <p className="text-sm text-stone-400">Nothing to set aside.</p>}
          {receivedItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-teal-200 bg-teal-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {item.book.title}{" "}
                    <Link
                      href={`/pickup-slip/${item.id}`}
                      target="_blank"
                      className="text-xs font-normal text-blue-700 underline"
                    >
                      Print pickup slip ↗
                    </Link>
                  </p>
                  <p className="text-xs text-stone-500">
                    <Link href={`/dashboard/orders/${item.orderId}`} className="underline">
                      #{item.orderId}
                    </Link>{" "}
                    · {item.order.customer.name} · Qty {item.quantity}
                  </p>
                </div>
                <LineItemStatusBadge status={item.status} />
              </div>
              {(item.isPreorder || item.order.isPrepaid) && (
                <PriceLookup
                  itemId={item.id}
                  title={item.book.title}
                  isbn13={item.book.isbn13}
                  initialPrice={item.unitPrice}
                />
              )}
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Reshelve / Unclaimed</h2>
          <p className="text-xs text-stone-500">
            Expired, unpaid holds whose window has lapsed — mark for return or reshelving.
          </p>
        </CardHeader>
        <CardBody className="space-y-2">
          {unclaimedExpired.length === 0 && (
            <p className="text-sm text-stone-400">Nothing has expired.</p>
          )}
          {unclaimedExpired.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3">
              <div>
                <p className="font-medium">
                  {item.book.title}{" "}
                  <Link
                    href={`/pickup-slip/${item.id}`}
                    target="_blank"
                    className="text-xs font-normal text-blue-700 underline"
                  >
                    Print pickup slip ↗
                  </Link>
                </p>
                <p className="text-xs text-stone-500">
                  <Link href={`/dashboard/orders/${item.orderId}`} className="underline">
                    #{item.orderId}
                  </Link>{" "}
                  · {item.order.customer.name} · Expired {formatDateTime(item.expirationDate)}
                </p>
              </div>
              <LineItemStatusBadge status={item.status} />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
