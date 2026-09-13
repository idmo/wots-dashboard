import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { extendExpirationDate, calculateExpirationDate } from "@/lib/domain/deadlines";

// POST /api/order-items/[id]/extend — Extend Deadline Pop-up (PRD 7.5):
// manual extension/override of the calculated expiration date.
export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/order-items/[id]/extend">
) {
  const { id } = await params;
  const body = await request.json();
  const extraDays = Number(body?.extraDays);
  if (!extraDays || extraDays <= 0) {
    return NextResponse.json({ error: "extraDays must be a positive number" }, { status: 400 });
  }

  const item = await db.query.orderItems.findFirst({ where: eq(schema.orderItems.id, Number(id)) });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const base =
    item.expirationDate ??
    calculateExpirationDate({ isPrepaid: false, notificationDate: item.notificationDate ?? new Date() });

  const newExpiration = base ? extendExpirationDate(base, extraDays) : null;

  const [updated] = await db
    .update(schema.orderItems)
    .set({ expirationDate: newExpiration })
    .where(eq(schema.orderItems.id, Number(id)))
    .returning();

  return NextResponse.json({ orderItem: updated });
}
