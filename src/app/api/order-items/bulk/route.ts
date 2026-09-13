import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { bulkLineItemStatusUpdateSchema } from "@/lib/domain/schemas";

// PATCH /api/order-items/bulk — Sortable Table View multi-select batch
// status transitions (PRD 7.3), e.g. bulk "Approved" -> "Ordered".
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const parsed = bulkLineItemStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db
    .update(schema.orderItems)
    .set({ status: parsed.data.status })
    .where(inArray(schema.orderItems.id, parsed.data.orderItemIds))
    .returning();

  return NextResponse.json({ updatedCount: updated.length, orderItems: updated });
}
