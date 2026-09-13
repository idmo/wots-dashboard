import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { calculateExpirationDate } from "@/lib/domain/deadlines";

// POST /api/orders/[id]/notify — Customer Notification & Deadline Management (PRD 7.5).
// Marks all "received" line items as notified and computes the pickup
// expiration deadline (prepaid items get no deadline; unpaid items get a
// 7-day, closed-day-aware deadline from now).
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/orders/[id]/notify">
) {
  const { id } = await params;
  const orderId = Number(id);

  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const receivedItems = await db
    .select()
    .from(schema.orderItems)
    .where(and(eq(schema.orderItems.orderId, orderId), eq(schema.orderItems.status, "received")));

  for (const item of receivedItems) {
    const expirationDate = calculateExpirationDate({
      isPrepaid: order.isPrepaid,
      notificationDate: now,
    });
    await db
      .update(schema.orderItems)
      .set({ notificationDate: now, expirationDate })
      .where(eq(schema.orderItems.id, item.id));
  }

  return NextResponse.json({ notified: receivedItems.length, notificationDate: now });
}
