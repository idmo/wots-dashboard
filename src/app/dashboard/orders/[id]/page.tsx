import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { OrderDetail } from "@/components/dashboard/OrderDetail";

export default async function OrderDetailPage({ params }: PageProps<"/dashboard/orders/[id]">) {
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, Number(id)),
    with: { customer: true, items: { with: { book: true } } },
  });

  if (!order) notFound();

  return (
    <div className="space-y-4">
      <Link href="/dashboard/orders" className="text-sm text-stone-500 underline">
        ← All orders
      </Link>
      <OrderDetail
        order={{
          ...order,
          createdAt: order.createdAt.toISOString(),
          items: order.items.map((i) => ({
            ...i,
            notificationDate: i.notificationDate ? i.notificationDate.toISOString() : null,
            expirationDate: i.expirationDate ? i.expirationDate.toISOString() : null,
          })),
        }}
      />
    </div>
  );
}
