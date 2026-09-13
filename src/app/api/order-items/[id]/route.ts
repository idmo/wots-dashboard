import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { orderItemUpdateSchema } from "@/lib/domain/schemas";

// PATCH /api/order-items/[id] — staff update a single line item's status
// (PRD 3.4) and/or its unit price (e.g. after looking up the correct
// published price for a preorder/prepaid item). Recomputes the subtotal
// whenever the price changes.
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/order-items/[id]">
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = orderItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const current = await db.query.orderItems.findFirst({
    where: eq(schema.orderItems.id, Number(id)),
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Partial<typeof schema.orderItems.$inferInsert> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.unitPrice !== undefined) {
    updates.unitPrice = parsed.data.unitPrice.toFixed(2);
    updates.subtotal = (parsed.data.unitPrice * current.quantity).toFixed(2);
  }

  const [updated] = await db
    .update(schema.orderItems)
    .set(updates)
    .where(eq(schema.orderItems.id, Number(id)))
    .returning();

  return NextResponse.json({ orderItem: updated });
}
