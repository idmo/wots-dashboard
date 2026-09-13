import { NextRequest, NextResponse } from "next/server";
import { or, ilike, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { customerInputSchema } from "@/lib/domain/schemas";

// GET /api/customers?q=search — search by Name, Email, or Phone (PRD 3.1)
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  const results = await db.query.customers.findMany({
    where: q
      ? or(
          ilike(schema.customers.name, `%${q}%`),
          ilike(schema.customers.email, `%${q}%`),
          ilike(schema.customers.phone, `%${q}%`)
        )
      : undefined,
    orderBy: [desc(schema.customers.createdAt)],
    limit: 25,
  });

  return NextResponse.json({ customers: results });
}

// POST /api/customers — capture a new customer (PRD 3.1)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = customerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [customer] = await db
    .insert(schema.customers)
    .values({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    })
    .returning();

  return NextResponse.json({ customer }, { status: 201 });
}
