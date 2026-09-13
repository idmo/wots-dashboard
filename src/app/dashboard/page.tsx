import { computeDashboardMetrics } from "@/lib/domain/metrics";

// Metrics reflect live order data — never freeze this at build time.
export const dynamic = "force-dynamic";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { BarList } from "@/components/dashboard/BarList";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default async function DashboardOverviewPage() {
  const metrics = await computeDashboardMetrics();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-stone-500">Order metrics rollup — PRD 7.2</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Total orders" value={metrics.totalOrders} />
        <MetricCard label="Avg orders / day" value={metrics.avgOrdersPerDay} />
        <MetricCard label="Ready for pickup" value={metrics.pendingPickups} hint="Awaiting customer" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Calendar</h2>
          </CardHeader>
          <CardBody>
            <CalendarView
              orderVolumeByDay={metrics.orderVolumeByDay}
              pickupDeadlinesByDay={metrics.pickupDeadlinesByDay}
            />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Top genres</h2>
            </CardHeader>
            <CardBody>
              <BarList items={metrics.topGenres.map((g) => ({ label: g.genre, count: g.count }))} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Top requested authors</h2>
            </CardHeader>
            <CardBody>
              <BarList items={metrics.topAuthors.map((a) => ({ label: a.author, count: a.count }))} />
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Customer reliability</h2>
          <p className="text-xs text-stone-500">
            Pickup success vs. expiration/abandonment — informs unpaid special order approval eligibility.
          </p>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs uppercase text-stone-400">
                <th className="py-2">Customer</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Fulfilled</th>
                <th className="py-2 text-right">Abandoned</th>
                <th className="py-2 text-right">Pickup rate</th>
              </tr>
            </thead>
            <tbody>
              {metrics.customerReliability.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-stone-400">
                    No order history yet.
                  </td>
                </tr>
              )}
              {metrics.customerReliability.map((c) => (
                <tr key={c.id} className="border-b border-stone-50">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-right">{c.totalOrders}</td>
                  <td className="py-2 text-right">{c.fulfilledOrders}</td>
                  <td className="py-2 text-right">{c.abandonedOrders}</td>
                  <td className="py-2 text-right font-medium">
                    {c.pickupRate === null ? "—" : `${c.pickupRate}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
