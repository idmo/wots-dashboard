import { Card, CardBody } from "@/components/ui/Card";

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
      </CardBody>
    </Card>
  );
}
