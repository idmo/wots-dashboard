import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { OrderStatusBadge, PreorderPrepaidTags } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/domain/status";

// Staff Lookup & Management View (PRD 3.4): search orders by customer name,
// email, or phone; see top-level status alongside line-item pipeline state.
export default async function DashboardOrdersPage({
  searchParams,
}: PageProps<"/dashboard/orders">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? (sp.status as OrderStatus) : "";

  const orders = await db.query.orders.findMany({
    where: and(
      status ? eq(schema.orders.status, status) : undefined,
      q
        ? or(
            ilike(schema.customers.name, `%${q}%`),
            ilike(schema.customers.email, `%${q}%`),
            ilike(schema.customers.phone, `%${q}%`)
          )
        : undefined
    ),
    with: { customer: true, items: true },
    orderBy: [desc(schema.orders.createdAt)],
    limit: 100,
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-stone-500">Search by customer name, email, or phone</p>
      </header>

      <form className="flex flex-wrap gap-2" method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search customer…"
          className="touch-target min-w-[220px] flex-1 rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status}
          className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button className="touch-target rounded-lg bg-stone-900 px-4 text-sm font-medium text-white">
          Search
        </button>
      </form>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left text-xs uppercase text-stone-400">
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-stone-400">
                    No orders found.
                  </td>
                </tr>
              )}
              {orders.map((o) => {
                const total = o.items.reduce((sum, i) => sum + Number(i.subtotal), 0);
                const hasPreorder = o.items.some((i) => i.isPreorder);
                return (
                  <tr key={o.id} className="border-b border-stone-50 hover:bg-stone-50">
                    <td className="px-4 py-2">
                      <Link href={`/dashboard/orders/${o.id}`} className="font-medium text-stone-900 underline underline-offset-2">
                        #{o.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{o.customer.name}</td>
                    <td className="px-4 py-2">
                      {o.items.length} <PreorderPrepaidTags isPreorder={hasPreorder} isPrepaid={o.isPrepaid} />
                    </td>
                    <td className="px-4 py-2">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-2 text-stone-500">{formatDateTime(o.createdAt)}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
