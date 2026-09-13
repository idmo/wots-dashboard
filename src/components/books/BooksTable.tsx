"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

type Book = {
  id: number;
  title: string;
  genre: string | null;
  binding: "Paperback" | "Hardcover";
  isbn13: string | null;
  thumbnailUrl: string | null;
  retailPrice: string | null;
  bookAuthors: { author: { id: number; name: string } }[];
};

function authorNames(book: Book) {
  return book.bookAuthors.map((ba) => ba.author.name).join(", ");
}

export function BooksTable({
  books,
  orderedCountByBook,
}: {
  books: Book[];
  orderedCountByBook: Record<number, number>;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <table className="w-full min-w-[720px] text-sm">
      <thead>
        <tr className="border-b border-stone-100 bg-stone-50 text-left text-xs uppercase text-stone-400">
          <th className="px-4 py-2"></th>
          <th className="px-4 py-2">Title</th>
          <th className="px-4 py-2">Author</th>
          <th className="px-4 py-2">Genre</th>
          <th className="px-4 py-2">Binding</th>
          <th className="px-4 py-2">ISBN</th>
          <th className="px-4 py-2 text-right">Price</th>
          <th className="px-4 py-2 text-right">Times ordered</th>
          <th className="px-4 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {books.length === 0 && (
          <tr>
            <td colSpan={9} className="px-4 py-6 text-center text-stone-400">
              No books found.
            </td>
          </tr>
        )}
        {books.map((b) =>
          editingId === b.id ? (
            <EditBookRow
              key={b.id}
              book={b}
              onDone={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <tr key={b.id} className="border-b border-stone-50 hover:bg-stone-50">
              <td className="px-4 py-2">
                <div className="flex h-12 w-9 items-center justify-center overflow-hidden rounded bg-stone-100 text-[9px] text-stone-400">
                  {b.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "No cover"
                  )}
                </div>
              </td>
              <td className="px-4 py-2 font-medium">{b.title}</td>
              <td className="px-4 py-2 text-stone-500">{authorNames(b) || "—"}</td>
              <td className="px-4 py-2 text-stone-500">{b.genre ?? "—"}</td>
              <td className="px-4 py-2 text-stone-500">{b.binding}</td>
              <td className="px-4 py-2 text-stone-500">{b.isbn13 ?? "—"}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(b.retailPrice)}</td>
              <td className="px-4 py-2 text-right">{orderedCountByBook[b.id] ?? 0}</td>
              <td className="px-4 py-2 text-right">
                <Button size="md" variant="ghost" onClick={() => setEditingId(b.id)}>
                  Edit
                </Button>
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

function EditBookRow({
  book,
  onDone,
  onCancel,
}: {
  book: Book;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(authorNames(book));
  const [genre, setGenre] = useState(book.genre ?? "");
  const [binding, setBinding] = useState<"Paperback" | "Hardcover">(book.binding);
  const [isbn13, setIsbn13] = useState(book.isbn13 ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(book.thumbnailUrl ?? "");
  const [retailPrice, setRetailPrice] = useState(book.retailPrice ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refreshLookup = () => {
    if (!title.trim()) {
      setRefreshNote("Enter a title first");
      return;
    }
    setRefreshing(true);
    setRefreshNote("");
    fetch(`/api/books/lookup?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.result) {
          setRefreshNote("No OpenLibrary match — nothing changed.");
          return;
        }
        setIsbn13(data.result.isbn13 || isbn13);
        setThumbnailUrl(data.result.thumbnailUrl || thumbnailUrl);
        setGenre(data.result.genre || genre);
        setRefreshNote("Pulled the latest ISBN, cover, and genre — review below, then save.");
      })
      .catch(() => setRefreshNote("Lookup failed — try again."))
      .finally(() => setRefreshing(false));
  };

  const save = () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");
    fetch(`/api/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        authors: author
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        genre,
        binding,
        isbn13,
        thumbnailUrl,
        retailPrice: retailPrice.trim() ? Number(retailPrice) : undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(() => {
        router.refresh();
        onDone();
      })
      .catch(() => setError("Couldn't save — try again."))
      .finally(() => setSaving(false));
  };

  return (
    <tr className="border-b border-stone-50 bg-stone-50/60">
      <td colSpan={9} className="px-4 py-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none sm:col-span-2"
            placeholder="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="Author(s), comma-separated"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="Genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          />
          <select
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            value={binding}
            onChange={(e) => setBinding(e.target.value as "Paperback" | "Hardcover")}
          >
            <option value="Paperback">Paperback</option>
            <option value="Hardcover">Hardcover</option>
          </select>
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="ISBN-13"
            value={isbn13}
            onChange={(e) => setIsbn13(e.target.value)}
          />
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="Price"
            inputMode="decimal"
            value={retailPrice}
            onChange={(e) => setRetailPrice(e.target.value)}
          />
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none sm:col-span-2"
            placeholder="Cover image URL"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button type="button" size="md" variant="secondary" onClick={refreshLookup} disabled={refreshing}>
            {refreshing ? "Looking up…" : "Rerun ISBN/cover lookup"}
          </Button>
          {refreshNote && <span className="text-xs text-stone-500">{refreshNote}</span>}
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-3 flex gap-2">
          <Button size="md" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button size="md" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}
