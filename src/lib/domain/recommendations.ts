import { db, schema } from "@/lib/db";

// Simple, explainable "quick recommendations" — no ML, just content-based
// matching against a customer's own order history (genre/author overlap),
// with a small popularity nudge, and a trending fallback for customers
// with no history yet. Meant for staff to scan ahead of a call or a
// newsletter, not a live register feature.

export type RecommendedBook = {
  id: number;
  title: string;
  author: string | null;
  genre: string | null;
  thumbnailUrl: string | null;
  reason: string;
};

export type CustomerRecommendation = {
  customerId: number;
  customerName: string;
  customerEmail: string | null;
  basis: "history" | "trending";
  picks: RecommendedBook[];
};

const HISTORY_GENRE_WEIGHT = 2;
const HISTORY_AUTHOR_WEIGHT = 3;
const POPULARITY_WEIGHT = 0.1;
const POPULARITY_CAP = 5;

export async function computeRecommendations(limit = 3): Promise<CustomerRecommendation[]> {
  const [customers, catalog, orderItems] = await Promise.all([
    db.query.customers.findMany({
      with: {
        orders: {
          with: {
            items: {
              with: { book: { with: { bookAuthors: { with: { author: true } } } } },
            },
          },
        },
      },
    }),
    db.query.books.findMany({
      with: { bookAuthors: { with: { author: true } } },
    }),
    db.select({ bookId: schema.orderItems.bookId, quantity: schema.orderItems.quantity }).from(
      schema.orderItems
    ),
  ]);

  const popularityByBook = new Map<number, number>();
  for (const item of orderItems) {
    popularityByBook.set(item.bookId, (popularityByBook.get(item.bookId) ?? 0) + item.quantity);
  }

  function authorNamesFor(book: (typeof catalog)[number]): string[] {
    return book.bookAuthors.map((ba) => ba.author.name);
  }

  function primaryAuthorFor(book: (typeof catalog)[number]): string | null {
    return book.bookAuthors[0]?.author.name ?? null;
  }

  const trendingOverall = [...catalog].sort(
    (a, b) => (popularityByBook.get(b.id) ?? 0) - (popularityByBook.get(a.id) ?? 0)
  );

  return customers.map((customer) => {
    const orderedBooks = customer.orders.flatMap((o) => o.items.map((i) => i.book));
    const orderedBookIds = new Set(orderedBooks.map((b) => b.id));
    const genres = new Set(orderedBooks.map((b) => b.genre).filter((g): g is string => Boolean(g)));
    const authorNames = new Set(orderedBooks.flatMap((b) => authorNamesFor(b)));

    const candidates = catalog.filter((b) => !orderedBookIds.has(b.id));

    const scored = candidates
      .map((book) => {
        let score = 0;
        let reason: string | null = null;

        const matchedAuthor = authorNamesFor(book).find((name) => authorNames.has(name));
        if (matchedAuthor) {
          score += HISTORY_AUTHOR_WEIGHT;
          reason = `More by ${matchedAuthor}`;
        } else if (book.genre && genres.has(book.genre)) {
          score += HISTORY_GENRE_WEIGHT;
          reason = `More ${book.genre}`;
        }

        score += Math.min(popularityByBook.get(book.id) ?? 0, POPULARITY_CAP) * POPULARITY_WEIGHT;

        return { book, score, reason };
      })
      .filter((s) => s.reason !== null)
      .sort((a, b) => b.score - a.score);

    const useHistory = scored.length > 0;
    const source = useHistory
      ? scored.slice(0, limit)
      : trendingOverall
          .filter((b) => !orderedBookIds.has(b.id))
          .slice(0, limit)
          .map((book) => ({ book, score: popularityByBook.get(book.id) ?? 0, reason: "Trending in store" }));

    return {
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      basis: (useHistory ? "history" : "trending") as "history" | "trending",
      picks: source.map(({ book, reason }) => ({
        id: book.id,
        title: book.title,
        author: primaryAuthorFor(book),
        genre: book.genre,
        thumbnailUrl: book.thumbnailUrl,
        reason: reason ?? "Trending in store",
      })),
    };
  });
}
