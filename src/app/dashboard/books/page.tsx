import { ilike } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

// Book catalog list view — search by title, with order-demand at a glance.
export default async function BooksPage({ searchParams }: PageProps<"/dashboard/books">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  const [books, orderItems] = await Promise.all([
    db.query.books.findMany({
      where: q ? ilike(schema.books.title, `%${q}%`) : undefined,
      with: { bookAuthors: { with: { author: true } } },
      orderBy: (books, { asc }) => [asc(books.title)],
      limit: 300,
    }),
    db.select({ bookId: schema.orderItems.bookId, quantity: schema.orderItems.quantity }).from(schema.orderItems),
  ]);

  const orderedCountByBook = new Map<number, number>();
  for (const item of orderItems) {
    orderedCountByBook.set(item.bookId, (orderedCountByBook.get(item.bookId) ?? 0) + item.quantity);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Books</h1>
        <p className="text-sm text-stone-500">{books.length} in catalog</p>
      </header>

      <form className="flex flex-wrap gap-2" method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title…"
          className="touch-target min-w-[220px] flex-1 rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
        />
        <button className="touch-target rounded-lg bg-stone-900 px-4 text-sm font-medium text-white">
          Search
        </button>
      </form>

      <Card>
        <CardBody className="overflow-x-auto p-0">
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
              </tr>
            </thead>
            <tbody>
              {books.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-stone-400">
                    No books found.
                  </td>
                </tr>
              )}
              {books.map((b) => (
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
                  <td className="px-4 py-2 text-stone-500">
                    {b.bookAuthors.map((ba) => ba.author.name).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2 text-stone-500">{b.genre ?? "—"}</td>
                  <td className="px-4 py-2 text-stone-500">{b.binding}</td>
                  <td className="px-4 py-2 text-stone-500">{b.isbn13 ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(b.retailPrice)}</td>
                  <td className="px-4 py-2 text-right">{orderedCountByBook.get(b.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
