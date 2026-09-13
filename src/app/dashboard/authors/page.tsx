import { ilike } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";

// Author list view — search by name, with catalog size and order-demand rollups.
export default async function AuthorsPage({ searchParams }: PageProps<"/dashboard/authors">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  const authors = await db.query.authors.findMany({
    where: q ? ilike(schema.authors.name, `%${q}%`) : undefined,
    with: { bookAuthors: { with: { book: { with: { orderItems: true } } } } },
    orderBy: (authors, { asc }) => [asc(authors.name)],
    limit: 300,
  });

  const rows = authors
    .map((a) => {
      const books = a.bookAuthors.map((ba) => ba.book);
      const timesOrdered = books.reduce(
        (sum, book) => sum + book.orderItems.reduce((s, i) => s + i.quantity, 0),
        0
      );
      return { id: a.id, name: a.name, bookCount: books.length, timesOrdered };
    })
    .sort((a, b) => b.timesOrdered - a.timesOrdered);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Authors</h1>
        <p className="text-sm text-stone-500">{authors.length} on file</p>
      </header>

      <form className="flex flex-wrap gap-2" method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search author name…"
          className="touch-target min-w-[220px] flex-1 rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
        />
        <button className="touch-target rounded-lg bg-stone-900 px-4 text-sm font-medium text-white">
          Search
        </button>
      </form>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left text-xs uppercase text-stone-400">
                <th className="px-4 py-2">Author</th>
                <th className="px-4 py-2 text-right">Books in catalog</th>
                <th className="px-4 py-2 text-right">Times ordered</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-stone-400">
                    No authors found.
                  </td>
                </tr>
              )}
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-stone-50 hover:bg-stone-50">
                  <td className="px-4 py-2 font-medium">{a.name}</td>
                  <td className="px-4 py-2 text-right">{a.bookCount}</td>
                  <td className="px-4 py-2 text-right">{a.timesOrdered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
