"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

type Author = { author: { id: number; name: string } };
type Book = {
  id: number;
  title: string;
  binding: "Paperback" | "Hardcover";
  thumbnailUrl: string | null;
  bookAuthors: Author[];
};
type Recommendation = {
  id: number;
  blurb: string;
  createdAt: Date;
  featuredMonth: number | null;
  featuredYear: number | null;
  book: Book;
};
type FeaturedReader = {
  id: number;
  name: string;
  role: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  recommendations: Recommendation[];
};

function bookAuthorNames(book: Book) {
  return book.bookAuthors.map((ba) => ba.author.name).join(", ");
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function featuredPeriodLabel(rec: Recommendation) {
  if (!rec.featuredMonth || !rec.featuredYear) return null;
  return `${MONTH_NAMES[rec.featuredMonth - 1]} ${rec.featuredYear}`;
}

export function FeaturedReadersBoard({ initialReaders }: { initialReaders: FeaturedReader[] }) {
  const router = useRouter();
  const [showNewReader, setShowNewReader] = useState(false);
  const [showNewRec, setShowNewRec] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={showNewReader ? "secondary" : "primary"}
          onClick={() => {
            setShowNewReader((v) => !v);
            setShowNewRec(false);
          }}
        >
          {showNewReader ? "Cancel" : "+ New featured reader"}
        </Button>
        <Button
          variant={showNewRec ? "secondary" : "primary"}
          onClick={() => {
            setShowNewRec((v) => !v);
            setShowNewReader(false);
          }}
          disabled={initialReaders.length === 0 && !showNewRec}
        >
          {showNewRec ? "Cancel" : "+ New recommendation"}
        </Button>
      </div>

      {initialReaders.length === 0 && !showNewReader && (
        <p className="text-sm text-stone-400">Add a featured reader before adding a recommendation.</p>
      )}

      {showNewReader && (
        <NewReaderForm
          onDone={() => {
            setShowNewReader(false);
            router.refresh();
          }}
        />
      )}

      {showNewRec && (
        <NewRecommendationForm
          readers={initialReaders}
          onDone={() => {
            setShowNewRec(false);
            router.refresh();
          }}
        />
      )}

      {initialReaders.length === 0 && !showNewReader ? null : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {initialReaders.map((reader) => (
            <Card key={reader.id}>
              <CardBody className="space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{reader.name}</p>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                      {reader.role}
                    </span>
                  </div>
                  {(reader.city || reader.state) && (
                    <p className="text-xs text-stone-400">
                      {[reader.city, reader.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {reader.bio && <p className="text-xs text-stone-400">{reader.bio}</p>}
                </div>

                {reader.recommendations.length === 0 ? (
                  <p className="text-sm text-stone-400">No recommendations yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {reader.recommendations.map((rec) => (
                      <li key={rec.id} className="flex gap-3 border-t border-stone-100 pt-3 first:border-0 first:pt-0">
                        <div className="flex h-16 w-11 flex-none items-center justify-center overflow-hidden rounded bg-stone-100 text-[8px] text-stone-400">
                          {rec.book.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={rec.book.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            "No cover"
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium">{rec.book.title}</p>
                            {featuredPeriodLabel(rec) && (
                              <span className="flex-none rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                {featuredPeriodLabel(rec)}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-stone-400">
                            {bookAuthorNames(rec.book) || rec.book.binding}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{rec.blurb}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewReaderForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Customer");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    setError("");
    fetch("/api/featured-readers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, bio, city, state }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(() => onDone())
      .catch(() => setError("Couldn't save — try again."))
      .finally(() => setSubmitting(false));
  };

  return (
    <Card>
      <CardBody className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">New featured reader</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none sm:col-span-2"
            placeholder="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="Customer">Customer</option>
            <option value="Employee">Employee</option>
          </select>
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none sm:col-span-2"
            placeholder="Bio (optional) — e.g. store manager"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="City (optional)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="State (optional)"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Saving…" : "Add featured reader"}
        </Button>
      </CardBody>
    </Card>
  );
}

type BookSearchResult = Book;

function NewRecommendationForm({
  readers,
  onDone,
}: {
  readers: FeaturedReader[];
  onDone: () => void;
}) {
  const [featuredReaderId, setFeaturedReaderId] = useState<number | "">(readers[0]?.id ?? "");
  const [blurb, setBlurb] = useState("");
  const [featuredMonth, setFeaturedMonth] = useState(() => new Date().getMonth() + 1);
  const [featuredYear, setFeaturedYear] = useState(() => new Date().getFullYear());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Catalog search — pick an existing book…
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);

  const showResults = !selectedBook && query.trim().length >= 2;

  useEffect(() => {
    if (selectedBook || query.trim().length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/books?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setResults(data.books ?? []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, selectedBook]);

  // …or enter one manually, with the same background OpenLibrary lookup
  // used at the register.
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualBinding, setManualBinding] = useState<"Paperback" | "Hardcover" | "">("");
  const [manualIsbn13, setManualIsbn13] = useState("");
  const [manualThumbnailUrl, setManualThumbnailUrl] = useState("");
  const [manualGenre, setManualGenre] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "done" | "miss">("idle");
  const lastLookupKey = useRef("");

  useEffect(() => {
    if (!manualTitle || !manualAuthor || !manualBinding) return;
    const key = `${manualTitle}|${manualAuthor}|${manualBinding}`;
    if (key === lastLookupKey.current) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      lastLookupKey.current = key;
      setLookupStatus("loading");
      fetch(
        `/api/books/lookup?title=${encodeURIComponent(manualTitle)}&author=${encodeURIComponent(manualAuthor)}`,
        { signal: controller.signal }
      )
        .then((r) => r.json())
        .then((data) => {
          if (!data.result) {
            setLookupStatus("miss");
            return;
          }
          setManualIsbn13((v) => v || data.result.isbn13 || "");
          setManualThumbnailUrl((v) => v || data.result.thumbnailUrl || "");
          setManualGenre((v) => v || data.result.genre || "");
          setLookupStatus("done");
        })
        .catch(() => setLookupStatus("miss"));
    }, 500);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [manualTitle, manualAuthor, manualBinding]);

  const submit = () => {
    if (!featuredReaderId) {
      setError("Choose a featured reader");
      return;
    }
    if (!blurb.trim()) {
      setError("Add a few words on why they recommend it");
      return;
    }
    if (!selectedBook && !(manualTitle && manualBinding)) {
      setError("Pick a book from the catalog, or enter a title and binding");
      return;
    }

    setSubmitting(true);
    setError("");
    fetch("/api/book-recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        featuredReaderId,
        blurb,
        featuredMonth,
        featuredYear,
        ...(selectedBook
          ? { bookId: selectedBook.id }
          : {
              title: manualTitle,
              author: manualAuthor,
              binding: manualBinding,
              isbn13: manualIsbn13,
              thumbnailUrl: manualThumbnailUrl,
              genre: manualGenre,
            }),
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(() => onDone())
      .catch(() => setError("Couldn't save — try again."))
      .finally(() => setSubmitting(false));
  };

  return (
    <Card>
      <CardBody className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">New recommendation</p>

        <select
          className="touch-target w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
          value={featuredReaderId}
          onChange={(e) => setFeaturedReaderId(Number(e.target.value))}
        >
          {readers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.role})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-500">Featured for</label>
          <select
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            value={featuredMonth}
            onChange={(e) => setFeaturedMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="touch-target w-24 rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            value={featuredYear}
            onChange={(e) => setFeaturedYear(Number(e.target.value) || featuredYear)}
          />
        </div>

        {!selectedBook ? (
          <div className="space-y-2">
            <input
              className="touch-target w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
              placeholder="Search catalog by title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {showResults && searching && <p className="text-sm text-stone-400">Searching…</p>}
            {showResults && results.length > 0 && (
              <ul className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200">
                {results.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className="touch-target flex w-full flex-col items-start px-3 py-2 text-left hover:bg-stone-50"
                      onClick={() => {
                        setSelectedBook(b);
                        setQuery("");
                        setResults([]);
                      }}
                    >
                      <span className="font-medium">{b.title}</span>
                      <span className="text-sm text-stone-500">
                        {bookAuthorNames(b) || b.binding}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!showManual ? (
              <Button type="button" variant="ghost" onClick={() => setShowManual(true)}>
                Can&apos;t find it? Enter manually
              </Button>
            ) : (
              <div className="grid grid-cols-1 gap-2 rounded-lg bg-stone-50 p-3 sm:grid-cols-2">
                <input
                  className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none sm:col-span-2"
                  placeholder="Title *"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                />
                <input
                  className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
                  placeholder="Author"
                  value={manualAuthor}
                  onChange={(e) => setManualAuthor(e.target.value)}
                />
                <select
                  className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
                  value={manualBinding}
                  onChange={(e) => setManualBinding(e.target.value as "Paperback" | "Hardcover" | "")}
                >
                  <option value="">Binding *</option>
                  <option value="Paperback">Paperback</option>
                  <option value="Hardcover">Hardcover</option>
                </select>
                {lookupStatus === "loading" && (
                  <p className="text-xs text-stone-400 sm:col-span-2">
                    Looking up cover & ISBN in the background…
                  </p>
                )}
                {lookupStatus === "miss" && (
                  <p className="text-xs text-stone-400 sm:col-span-2">No catalog match — that&apos;s fine.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-stone-200 p-2">
            <div>
              <p className="text-sm font-medium">{selectedBook.title}</p>
              <p className="text-xs text-stone-500">{bookAuthorNames(selectedBook) || selectedBook.binding}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setSelectedBook(null);
                setShowManual(false);
              }}
            >
              Change
            </Button>
          </div>
        )}

        <textarea
          className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-stone-900 focus:outline-none"
          placeholder="Why do they recommend it? *"
          rows={4}
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Saving…" : "Add recommendation"}
        </Button>
      </CardBody>
    </Card>
  );
}
