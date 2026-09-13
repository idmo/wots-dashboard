import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { customerUpdateSchema } from "@/lib/domain/schemas";

// PATCH /api/customers/[id] — back-office data cleanup: fix a typo'd name,
// or add/correct an email or phone number.
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/customers/[id]">
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(schema.customers)
    .set({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    })
    .where(eq(schema.customers.id, Number(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ customer: updated });
}
