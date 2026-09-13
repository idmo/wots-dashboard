import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { bookRecommendationUpdateSchema } from "@/lib/domain/schemas";

// PATCH /api/book-recommendations/[id] — correct a blurb, or move a pick
// to a different Featured Reader display period.
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/book-recommendations/[id]">
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = bookRecommendationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const [updated] = await db
    .update(schema.bookRecommendations)
    .set({
      blurb: input.blurb,
      featuredMonth: input.featuredMonth ?? null,
      featuredYear: input.featuredYear ?? null,
    })
    .where(eq(schema.bookRecommendations.id, Number(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ recommendation: updated });
}
