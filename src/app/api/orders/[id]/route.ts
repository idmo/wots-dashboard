import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: RouteContext<"/api/orders/[id]">) {
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, Number(id)),
    with: { customer: true, items: { with: { book: { with: { bookAuthors: { with: { author: true } } } } } } },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

// PATCH /api/orders/[id] — update order-level notes / prepaid flag / manual status override
export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/orders/[id]">) {
  const { id } = await params;
  const body = await request.json();
  const { notes, isPrepaid, status } = body ?? {};

  const [updated] = await db
    .update(schema.orders)
    .set({
      ...(notes !== undefined ? { notes } : {}),
      ...(isPrepaid !== undefined ? { isPrepaid } : {}),
      ...(status !== undefined ? { status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.orders.id, Number(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full = await db.query.orders.findFirst({
    where: eq(schema.orders.id, Number(id)),
    with: { customer: true, items: { with: { book: true } } },
  });

  return NextResponse.json({ order: full });
}
