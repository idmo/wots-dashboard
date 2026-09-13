import { NextRequest, NextResponse } from "next/server";
import { eq, ilike, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// GET /api/books?q=search — catalog lookup for the register's "add book" flow (PRD 3.2)
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    const recent = await db.query.books.findMany({
      orderBy: [desc(schema.books.createdAt)],
      limit: 10,
      with: { bookAuthors: { with: { author: true } } },
    });
    return NextResponse.json({ books: recent });
  }

  const results = await db.query.books.findMany({
    where: ilike(schema.books.title, `%${q}%`),
    orderBy: [desc(schema.books.createdAt)],
    limit: 15,
    with: { bookAuthors: { with: { author: true } } },
  });

  return NextResponse.json({ books: results });
}

// POST /api/books — manual catalog entry (PRD 3.2: Title, Author, Binding required)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, author, binding, isbn13, thumbnailUrl, retailPrice, genre } = body ?? {};

  if (!title || !binding) {
    return NextResponse.json({ error: "Title and Binding are required" }, { status: 400 });
  }

  const [book] = await db
    .insert(schema.books)
    .values({
      title,
      binding,
      isbn13: isbn13 || null,
      thumbnailUrl: thumbnailUrl || null,
      retailPrice: retailPrice != null ? String(retailPrice) : null,
      genre: genre || null,
    })
    .returning();

  if (author) {
    let [existingAuthor] = await db
      .select()
      .from(schema.authors)
      .where(eq(schema.authors.name, author))
      .limit(1);

    if (!existingAuthor) {
      [existingAuthor] = await db.insert(schema.authors).values({ name: author }).returning();
    }

    await db.insert(schema.bookAuthors).values({ bookId: book.id, authorId: existingAuthor.id });
  }

  return NextResponse.json({ book }, { status: 201 });
}
