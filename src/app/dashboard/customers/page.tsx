import Link from "next/link";
import { desc, ilike, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

// Customer list view — search by name/email/phone, with pickup reliability
// at a glance (PRD 7.2 "Customer Reliability Analytics").
export default async function CustomersPage({ searchParams }: PageProps<"/dashboard/customers">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  const customers = await db.query.customers.findMany({
    where: q
      ? or(
          ilike(schema.customers.name, `%${q}%`),
          ilike(schema.customers.email, `%${q}%`),
          ilike(schema.customers.phone, `%${q}%`)
        )
      : undefined,
    orderBy: [desc(schema.customers.createdAt)],
    limit: 200,
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-stone-500">{customers.length} on file</p>
      </header>

      <form className="flex flex-wrap gap-2" method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, or phone…"
          className="touch-target min-w-[220px] flex-1 rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
        />
        <button className="touch-target rounded-lg bg-stone-900 px-4 text-sm font-medium text-white">
          Search
        </button>
      </form>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left text-xs uppercase text-stone-400">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2 text-right">Orders</th>
                <th className="px-4 py-2 text-right">Fulfilled</th>
                <th className="px-4 py-2 text-right">Abandoned</th>
                <th className="px-4 py-2">Customer since</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-stone-400">
                    No customers found.
                  </td>
                </tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-stone-50 hover:bg-stone-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/dashboard/orders?q=${encodeURIComponent(c.name)}`}
                      className="font-medium text-stone-900 underline underline-offset-2"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-stone-500">{c.email ?? "—"}</td>
                  <td className="px-4 py-2 text-stone-500">{c.phone ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{c.totalOrders}</td>
                  <td className="px-4 py-2 text-right">{c.fulfilledOrders}</td>
                  <td className="px-4 py-2 text-right">{c.abandonedOrders}</td>
                  <td className="px-4 py-2 text-stone-500">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
