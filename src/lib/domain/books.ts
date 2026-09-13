import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type ManualBookInput = {
  bookId?: number;
  title?: string;
  author?: string;
  binding?: "Paperback" | "Hardcover";
  isbn13?: string;
  thumbnailUrl?: string;
  genre?: string;
  unitPrice?: number;
};

/**
 * Resolves a book id from either an existing catalog `bookId`, or manual
 * entry fields — de-duping by ISBN-13 when one is supplied, same as the
 * register's order flow. Creates the book (and author link) if needed.
 * Returns null if neither a bookId nor enough manual fields were given.
 */
export async function findOrCreateBook(input: ManualBookInput): Promise<number | null> {
  if (input.bookId) return input.bookId;
  if (!input.title || !input.binding) return null;

  let existingBook = input.isbn13
    ? (
        await db.select().from(schema.books).where(eq(schema.books.isbn13, input.isbn13)).limit(1)
      )[0]
    : undefined;

  if (!existingBook) {
    [existingBook] = await db
      .insert(schema.books)
      .values({
        title: input.title,
        binding: input.binding,
        isbn13: input.isbn13 || null,
        thumbnailUrl: input.thumbnailUrl || null,
        retailPrice: input.unitPrice ? String(input.unitPrice) : null,
        genre: input.genre || null,
      })
      .returning();

    if (input.author) {
      let [author] = await db
        .select()
        .from(schema.authors)
        .where(eq(schema.authors.name, input.author))
        .limit(1);
      if (!author) {
        [author] = await db.insert(schema.authors).values({ name: input.author }).returning();
      }
      await db.insert(schema.bookAuthors).values({ bookId: existingBook.id, authorId: author.id });
    }
  }

  return existingBook.id;
}
