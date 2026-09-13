import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { featuredReaderInputSchema } from "@/lib/domain/schemas";

// GET /api/featured-readers — list, most recently added first.
export async function GET() {
  const readers = await db.query.featuredReaders.findMany({
    orderBy: [desc(schema.featuredReaders.createdAt)],
  });
  return NextResponse.json({ featuredReaders: readers });
}

// POST /api/featured-readers — add a featured reader. `role` is free text
// (the UI offers "Customer" / "Employee" as suggestions) — whether they're
// a real customer or staff doesn't affect anything functionally, and this
// table is deliberately separate from `customers` so it never touches
// real customer/order data.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = featuredReaderInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const role = input.role?.trim() || "Customer";
  const bio = input.bio?.trim();
  const city = input.city?.trim();
  const state = input.state?.trim();

  const [reader] = await db
    .insert(schema.featuredReaders)
    .values({ name: input.name, role, bio: bio || null, city: city || null, state: state || null })
    .returning();

  return NextResponse.json({ featuredReader: reader }, { status: 201 });
}
