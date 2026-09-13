// Live integration with the free, keyless OpenLibrary API, standing in for
// the PRD's "Google Books API or Open Library API" background metadata
// lookup (3.2). Triggered when Title, Author, and Binding are entered on
// the register; must not block cashier input, so this is always called
// from the client as a background fetch (see BookLineItemRow.tsx).

export type BookMetadataLookup = {
  title: string;
  author?: string;
};

export type BookMetadataResult = {
  thumbnailUrl: string | null;
  retailPrice: number | null; // OpenLibrary has no price data; null unless a fallback is configured
  isbn13: string | null;
  genre: string | null;
  source: "openlibrary";
};

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  subject?: string[];
};

type OpenLibrarySearchResponse = {
  docs: OpenLibraryDoc[];
};

function pickIsbn13(isbns: string[] | undefined): string | null {
  if (!isbns) return null;
  const isbn13 = isbns.find((i) => i.replace(/-/g, "").length === 13);
  return isbn13 ?? null;
}

/**
 * Looks up book metadata by title (+ optional author) via OpenLibrary's
 * search API. Returns null fields where OpenLibrary has no data (e.g.
 * retail price is never available and should be filled in manually or via
 * a future Ingram price lookup).
 */
export async function lookupBookMetadata(
  query: BookMetadataLookup
): Promise<BookMetadataResult | null> {
  const params = new URLSearchParams({
    title: query.title,
    limit: "1",
    fields: "title,author_name,isbn,cover_i,subject",
  });
  if (query.author) params.set("author", query.author);

  const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    headers: { "User-Agent": "wots-order-app (special-order tool)" },
    // Metadata changes rarely; a short cache keeps repeat lookups snappy
    // without going stale within a register shift.
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as OpenLibrarySearchResponse;
  const doc = data.docs?.[0];
  if (!doc) return null;

  return {
    thumbnailUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    retailPrice: null,
    isbn13: pickIsbn13(doc.isbn),
    genre: doc.subject?.[0] ?? null,
    source: "openlibrary",
  };
}
