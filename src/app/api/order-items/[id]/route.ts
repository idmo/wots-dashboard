import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { lineItemStatusUpdateSchema } from "@/lib/domain/schemas";

// PATCH /api/order-items/[id] — staff update a single line item's status
// without cancelling the entire order (PRD 3.4).
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/order-items/[id]">
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = lineItemStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(schema.orderItems)
    .set({ status: parsed.data.status })
    .where(eq(schema.orderItems.id, Number(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ orderItem: updated });
}
