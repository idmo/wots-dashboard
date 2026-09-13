import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { bookUpdateSchema } from "@/lib/domain/schemas";

// PATCH /api/books/[id] — back-office catalog cleanup (PRD "clean up
// data"): correct a misspelled title/author, or overwrite ISBN/cover/genre
// after rerunning the OpenLibrary lookup (see GET /api/books/lookup, which
// the edit form calls before submitting this). `authors` fully replaces
// the book's author links.
export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/books/[id]">) {
  const { id } = await params;
  const bookId = Number(id);
  const body = await request.json();
  const parsed = bookUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const updated = await db.transaction(async (tx) => {
    const [book] = await tx
      .update(schema.books)
      .set({
        title: input.title,
        binding: input.binding,
        isbn13: input.isbn13 || null,
        thumbnailUrl: input.thumbnailUrl || null,
        genre: input.genre || null,
        retailPrice: input.retailPrice != null ? String(input.retailPrice) : null,
      })
      .where(eq(schema.books.id, bookId))
      .returning();

    if (!book) return null;

    await tx.delete(schema.bookAuthors).where(eq(schema.bookAuthors.bookId, bookId));

    for (const name of input.authors) {
      let [author] = await tx.select().from(schema.authors).where(eq(schema.authors.name, name)).limit(1);
      if (!author) {
        [author] = await tx.insert(schema.authors).values({ name }).returning();
      }
      await tx.insert(schema.bookAuthors).values({ bookId, authorId: author.id });
    }

    return book;
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full = await db.query.books.findFirst({
    where: eq(schema.books.id, bookId),
    with: { bookAuthors: { with: { author: true } } },
  });

  return NextResponse.json({ book: full });
}
