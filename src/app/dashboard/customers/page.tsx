import { desc, ilike, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { CustomersTable } from "@/components/customers/CustomersTable";

// Customer list view — search by name/email/phone, with pickup reliability
// at a glance (PRD 7.2 "Customer Reliability Analytics"). Rows are editable
// in place for back-office data cleanup.
export const dynamic = "force-dynamic";

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
          <CustomersTable customers={customers} />
        </CardBody>
      </Card>
    </div>
  );
}
