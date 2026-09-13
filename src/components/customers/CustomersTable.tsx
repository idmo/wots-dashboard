"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  totalOrders: number;
  fulfilledOrders: number;
  abandonedOrders: number;
  createdAt: Date;
};

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
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
          <th className="px-4 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {customers.length === 0 && (
          <tr>
            <td colSpan={8} className="px-4 py-6 text-center text-stone-400">
              No customers found.
            </td>
          </tr>
        )}
        {customers.map((c) =>
          editingId === c.id ? (
            <EditCustomerRow
              key={c.id}
              customer={c}
              onDone={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
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
              <td className="px-4 py-2 text-right">
                <Button size="md" variant="ghost" onClick={() => setEditingId(c.id)}>
                  Edit
                </Button>
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

function EditCustomerRow({
  customer,
  onDone,
  onCancel,
}: {
  customer: Customer;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    fetch(`/api/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(() => {
        router.refresh();
        onDone();
      })
      .catch(() => setError("Couldn't save — try again."))
      .finally(() => setSaving(false));
  };

  return (
    <tr className="border-b border-stone-50 bg-stone-50/60">
      <td colSpan={8} className="px-4 py-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="touch-target rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-3 flex gap-2">
          <Button size="md" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button size="md" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}
