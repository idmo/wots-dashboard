import { db } from "@/lib/db";

export async function computeDashboardMetrics() {
  const [orders, customers] = await Promise.all([
    db.query.orders.findMany({
      with: { items: { with: { book: { with: { bookAuthors: { with: { author: true } } } } } } },
    }),
    db.query.customers.findMany(),
  ]);

  const byDay = new Map<string, number>();
  for (const o of orders) {
    const day = new Date(o.createdAt).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const dailyOrderVolume = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const totalOrders = orders.length;
  const daySpan = Math.max(1, dailyOrderVolume.length);
  const avgOrdersPerDay = Math.round((totalOrders / daySpan) * 10) / 10;

  const genreCounts = new Map<string, number>();
  const authorCounts = new Map<string, number>();
  for (const o of orders) {
    for (const item of o.items) {
      const genre = item.book.genre ?? "Uncategorized";
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + item.quantity);
      for (const ba of item.book.bookAuthors) {
        authorCounts.set(ba.author.name, (authorCounts.get(ba.author.name) ?? 0) + item.quantity);
      }
    }
  }
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre, count]) => ({ genre, count }));
  const topAuthors = Array.from(authorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([author, count]) => ({ author, count }));

  const customerReliability = customers
    .map((c) => {
      const total = c.totalOrders || 0;
      const fulfilled = c.fulfilledOrders || 0;
      const abandoned = c.abandonedOrders || 0;
      const pickupRate = total > 0 ? Math.round((fulfilled / total) * 100) : null;
      return {
        id: c.id,
        name: c.name,
        totalOrders: total,
        fulfilledOrders: fulfilled,
        abandonedOrders: abandoned,
        pickupRate,
      };
    })
    .filter((c) => c.totalOrders > 0)
    .sort((a, b) => (a.pickupRate ?? 100) - (b.pickupRate ?? 100));

  const pendingPickups = orders.filter((o) => o.status === "ready_for_pickup").length;

  // Interactive Calendar View data (PRD 7.2): daily order volume + pickup
  // deadlines. "Incoming deliveries" would require distributor-side ETA
  // data we don't have a stored field for yet — see README for the
  // suggested Order_Items.expected_delivery_date follow-up.
  const orderVolumeByDay = new Map(dailyOrderVolume.map((d) => [d.date, d.count]));
  const pickupDeadlinesByDay = new Map<string, number>();
  for (const o of orders) {
    for (const item of o.items) {
      if (!item.expirationDate) continue;
      if (item.status === "fulfilled" || item.status === "cancelled") continue;
      const day = new Date(item.expirationDate).toISOString().slice(0, 10);
      pickupDeadlinesByDay.set(day, (pickupDeadlinesByDay.get(day) ?? 0) + 1);
    }
  }

  return {
    totalOrders,
    avgOrdersPerDay,
    pendingPickups,
    dailyOrderVolume,
    topGenres,
    topAuthors,
    customerReliability,
    orderVolumeByDay: Object.fromEntries(orderVolumeByDay),
    pickupDeadlinesByDay: Object.fromEntries(pickupDeadlinesByDay),
  };
}

export type DashboardMetrics = Awaited<ReturnType<typeof computeDashboardMetrics>>;
