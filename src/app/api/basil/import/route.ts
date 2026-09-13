import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { parseBasilCsv } from "@/lib/services/basil";

// POST /api/basil/import { csv: string } — Basil System Reconciliation &
// File Import (PRD 7.4): cross-reference line items and batch status update.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const csv = body?.csv as string | undefined;
  if (!csv) return NextResponse.json({ error: "csv is required" }, { status: 400 });

  const { rows, errors } = parseBasilCsv(csv);

  let updatedCount = 0;
  const skipped: { row: number; reason: string }[] = [];

  for (const [index, row] of rows.entries()) {
    if (!row.orderItemId) {
      skipped.push({ row: index + 1, reason: "Missing OrderItemID column" });
      continue;
    }
    const existing = await db.query.orderItems.findFirst({
      where: eq(schema.orderItems.id, row.orderItemId),
    });
    if (!existing) {
      skipped.push({ row: index + 1, reason: `No line item with id ${row.orderItemId}` });
      continue;
    }
    await db
      .update(schema.orderItems)
      .set({ status: row.newStatus })
      .where(eq(schema.orderItems.id, row.orderItemId));
    updatedCount += 1;
  }

  return NextResponse.json({ updatedCount, skipped, parseErrors: errors, totalRows: rows.length });
}
