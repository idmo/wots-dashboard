import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { generateSampleBasilCsv } from "@/lib/services/basil";

// GET /api/basil/sample — generates a sample Basil export CSV from
// currently "ordered" line items, so the import flow (PRD 7.4) can be
// demoed without a real Basil export file.
export async function GET() {
  const items = await db.query.orderItems.findMany({
    where: eq(schema.orderItems.status, "ordered"),
    with: { book: true },
    limit: 20,
  });

  const csv = generateSampleBasilCsv(
    items.map((i) => ({
      orderItemId: i.id,
      isbn13: i.book.isbn13 ?? "",
      poNumber: `PO-${1000 + i.orderId}`,
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="basil-sample-export.csv"',
    },
  });
}
