import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { FeaturedReadersBoard } from "@/components/featured-readers/FeaturedReadersBoard";

// "Featured Readers" — customers or staff (the distinction is just a label)
// who leave long-form recommendations on books. Several readers can each
// recommend the same title for different reasons, so this reads as a wall
// of picks-with-reasons rather than a single ranked list.
export const dynamic = "force-dynamic";

export default async function FeaturedReadersPage() {
  const readers = await db.query.featuredReaders.findMany({
    with: {
      recommendations: {
        with: { book: { with: { bookAuthors: { with: { author: true } } } } },
        orderBy: (recommendations, { desc }) => [desc(recommendations.createdAt)],
      },
    },
    orderBy: [desc(schema.featuredReaders.createdAt)],
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Featured Readers</h1>
        <p className="text-sm text-stone-500">
          Customers or staff who recommend books, in their own words. Add a reader, then add their
          picks — the same book can show up more than once with a different reason each time.
        </p>
      </header>

      <FeaturedReadersBoard initialReaders={readers} />
    </div>
  );
}
