import { computeRecommendations } from "@/lib/domain/recommendations";
import { Card, CardBody } from "@/components/ui/Card";
import { cx } from "@/lib/utils";

// Quick, explainable customer-facing recommendations — a scannable page
// for staff to review ahead of a call or a newsletter, not a live register
// feature. See src/lib/domain/recommendations.ts for the (simple,
// non-ML) matching logic.
export const dynamic = "force-dynamic";

export default async function RecommendationsPage({
  searchParams,
}: PageProps<"/dashboard/recommendations">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.toLowerCase().trim() : "";

  const all = await computeRecommendations(3);
  const recommendations = q
    ? all.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          (r.customerEmail ?? "").toLowerCase().includes(q)
      )
    : all;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Recommendations</h1>
        <p className="text-sm text-stone-500">
          Quick picks per customer — matched to their past orders (genre/author), or trending
          store-wide for customers with no history yet. Handy to scan before a call or a
          newsletter.
        </p>
      </header>

      <form className="flex flex-wrap gap-2" method="GET">
        <input
          name="q"
          defaultValue={typeof sp.q === "string" ? sp.q : ""}
          placeholder="Search customer name or email…"
          className="touch-target min-w-[220px] flex-1 rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
        />
        <button className="touch-target rounded-lg bg-stone-900 px-4 text-sm font-medium text-white">
          Search
        </button>
      </form>

      {recommendations.length === 0 && (
        <Card>
          <CardBody className="text-center text-stone-400">No customers found.</CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((r) => (
          <Card key={r.customerId}>
            <CardBody className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.customerName}</p>
                  {r.customerEmail && <p className="text-xs text-stone-400">{r.customerEmail}</p>}
                </div>
                <span
                  className={cx(
                    "flex-none rounded-full px-2 py-0.5 text-[11px] font-medium",
                    r.basis === "history"
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-amber-100 text-amber-800"
                  )}
                >
                  {r.basis === "history" ? "Based on history" : "New — trending"}
                </span>
              </div>

              {r.picks.length === 0 ? (
                <p className="text-sm text-stone-400">No catalog matches yet.</p>
              ) : (
                <ul className="space-y-2">
                  {r.picks.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <div className="flex h-10 w-7 flex-none items-center justify-center overflow-hidden rounded bg-stone-100 text-[8px] text-stone-400">
                        {p.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          "—"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.title}</p>
                        <p className="truncate text-xs text-stone-400">
                          {p.author ? `${p.author} · ` : ""}
                          {p.reason}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
