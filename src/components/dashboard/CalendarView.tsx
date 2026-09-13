import { cx } from "@/lib/utils";

// Simplified "Interactive Calendar View" (PRD 7.2): current month grid with
// daily order volume and customer pickup deadline counts.
export function CalendarView({
  orderVolumeByDay,
  pickupDeadlinesByDay,
}: {
  orderVolumeByDay: Record<string, number>;
  pickupDeadlinesByDay: Record<string, number>;
}) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startWeekday = firstDay.getUTCDay();
  const todayStr = now.toISOString().slice(0, 10);

  const cells: (string | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      new Date(Date.UTC(year, month, i + 1)).toISOString().slice(0, 10)
    ),
  ];

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-stone-600">
        {firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-stone-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const orders = orderVolumeByDay[date] ?? 0;
          const deadlines = pickupDeadlinesByDay[date] ?? 0;
          const day = Number(date.slice(-2));
          return (
            <div
              key={date}
              className={cx(
                "flex min-h-14 flex-col rounded-md border p-1 text-left",
                date === todayStr ? "border-stone-900" : "border-stone-100"
              )}
            >
              <span className="text-[11px] text-stone-400">{day}</span>
              {orders > 0 && (
                <span className="mt-auto rounded bg-stone-700 px-1 text-[10px] font-medium text-white">
                  {orders} order{orders === 1 ? "" : "s"}
                </span>
              )}
              {deadlines > 0 && (
                <span className="mt-0.5 rounded bg-amber-500 px-1 text-[10px] font-medium text-white">
                  {deadlines} deadline{deadlines === 1 ? "" : "s"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
