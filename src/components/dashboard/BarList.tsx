export function BarList({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) {
    return <p className="text-sm text-stone-400">No data yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 flex-none truncate text-stone-600">{item.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-stone-700"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 flex-none text-right font-medium text-stone-900">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}
