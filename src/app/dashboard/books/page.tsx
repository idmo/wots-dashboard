import { ilike } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { BooksTable } from "@/components/books/BooksTable";

// Book catalog list view — search by title, with order-demand at a glance.
// Rows are editable in place for back-office data cleanup (fix a spelling,
// rerun the ISBN/cover lookup, correct the price).
export const dynamic = "force-dynamic";

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

  const orderedCountByBook: Record<number, number> = {};
  for (const item of orderItems) {
    orderedCountByBook[item.bookId] = (orderedCountByBook[item.bookId] ?? 0) + item.quantity;
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
          <BooksTable books={books} orderedCountByBook={orderedCountByBook} />
        </CardBody>
      </Card>
    </div>
  );
}
