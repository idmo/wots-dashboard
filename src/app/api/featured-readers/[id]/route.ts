import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { featuredReaderUpdateSchema } from "@/lib/domain/schemas";

// PATCH /api/featured-readers/[id] — correct a reader's name/role/bio or
// their city/state.
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/featured-readers/[id]">
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = featuredReaderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const role = input.role?.trim() || "Customer";
  const bio = input.bio?.trim();
  const city = input.city?.trim();
  const state = input.state?.trim();

  const [updated] = await db
    .update(schema.featuredReaders)
    .set({ name: input.name, role, bio: bio || null, city: city || null, state: state || null })
    .where(eq(schema.featuredReaders.id, Number(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ featuredReader: updated });
}
