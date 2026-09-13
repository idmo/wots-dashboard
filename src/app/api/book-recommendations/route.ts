import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { bookRecommendationInputSchema } from "@/lib/domain/schemas";
import { findOrCreateBook } from "@/lib/domain/books";

// GET /api/book-recommendations — list, most recent first. Optional
// ?bookId= or ?featuredReaderId= narrows to one book's / one reader's
// recommendations (e.g. for a "featured picks" section elsewhere).
export async function GET(request: NextRequest) {
  const bookId = request.nextUrl.searchParams.get("bookId");
  const featuredReaderId = request.nextUrl.searchParams.get("featuredReaderId");

  const recommendations = await db.query.bookRecommendations.findMany({
    where: bookId
      ? eq(schema.bookRecommendations.bookId, Number(bookId))
      : featuredReaderId
        ? eq(schema.bookRecommendations.featuredReaderId, Number(featuredReaderId))
        : undefined,
    with: {
      featuredReader: true,
      book: { with: { bookAuthors: { with: { author: true } } } },
    },
    orderBy: [desc(schema.bookRecommendations.createdAt)],
    limit: 200,
  });

  return NextResponse.json({ recommendations });
}

// POST /api/book-recommendations — a featured reader recommends a book,
// with a long-form blurb on why. The same reader (or a different one) can
// recommend the same book again with a different reason — no uniqueness
// constraint, that's the point (multiple perspectives on one title).
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = bookRecommendationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const reader = await db.query.featuredReaders.findFirst({
    where: eq(schema.featuredReaders.id, input.featuredReaderId),
  });
  if (!reader) {
    return NextResponse.json({ error: "Featured reader not found" }, { status: 404 });
  }

  const bookId = await findOrCreateBook(input);
  if (!bookId) {
    return NextResponse.json(
      { error: "Pick a book from the catalog, or enter a title and binding" },
      { status: 400 }
    );
  }

  const now = new Date();
  const [recommendation] = await db
    .insert(schema.bookRecommendations)
    .values({
      featuredReaderId: input.featuredReaderId,
      bookId,
      blurb: input.blurb,
      featuredMonth: input.featuredMonth ?? now.getMonth() + 1,
      featuredYear: input.featuredYear ?? now.getFullYear(),
    })
    .returning();

  const full = await db.query.bookRecommendations.findFirst({
    where: eq(schema.bookRecommendations.id, recommendation.id),
    with: {
      featuredReader: true,
      book: { with: { bookAuthors: { with: { author: true } } } },
    },
  });

  return NextResponse.json({ recommendation: full }, { status: 201 });
}
