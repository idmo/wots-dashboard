"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
};

export type NewCustomerDraft = { name: string; email: string; phone: string };

export function CustomerPanel({
  selected,
  onSelect,
  newCustomer,
  onNewCustomerChange,
}: {
  selected: Customer | null;
  onSelect: (c: Customer | null) => void;
  newCustomer: NewCustomerDraft;
  onNewCustomerChange: (draft: NewCustomerDraft) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  const showResults = !selected && query.trim().length >= 2;

  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/customers?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setResults(data.customers ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, selected]);

  if (selected) {
    return (
      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Customer</p>
            <p className="text-lg font-semibold">{selected.name}</p>
            <p className="text-sm text-stone-500">
              {[selected.email, selected.phone].filter(Boolean).join(" · ") || "No contact info"}
            </p>
          </div>
          <Button variant="secondary" onClick={() => onSelect(null)}>
            Change
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
          Find or add customer
        </p>
        <input
          className="touch-target w-full rounded-lg border border-stone-300 px-4 text-lg focus:border-stone-900 focus:outline-none"
          placeholder="Search name, email, or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {showResults && loading && <p className="text-sm text-stone-400">Searching…</p>}

        {showResults && results.length > 0 && (
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  className="touch-target flex w-full flex-col items-start px-4 py-2 text-left hover:bg-stone-50"
                  onClick={() => {
                    onSelect(c);
                    setQuery("");
                    setResults([]);
                  }}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm text-stone-500">
                    {[c.email, c.phone].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!showNewForm ? (
          <Button variant="ghost" size="md" onClick={() => setShowNewForm(true)}>
            + New customer
          </Button>
        ) : (
          <div className="space-y-2 rounded-lg bg-stone-50 p-3">
            <input
              className="touch-target w-full rounded-lg border border-stone-300 px-4 focus:border-stone-900 focus:outline-none"
              placeholder="Full name *"
              value={newCustomer.name}
              onChange={(e) => onNewCustomerChange({ ...newCustomer, name: e.target.value })}
            />
            <input
              className="touch-target w-full rounded-lg border border-stone-300 px-4 focus:border-stone-900 focus:outline-none"
              placeholder="Email"
              type="email"
              value={newCustomer.email}
              onChange={(e) => onNewCustomerChange({ ...newCustomer, email: e.target.value })}
            />
            <input
              className="touch-target w-full rounded-lg border border-stone-300 px-4 focus:border-stone-900 focus:outline-none"
              placeholder="Phone"
              value={newCustomer.phone}
              onChange={(e) => onNewCustomerChange({ ...newCustomer, phone: e.target.value })}
            />
            <p className="text-xs text-stone-500">
              This customer will be created when you submit the order.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
