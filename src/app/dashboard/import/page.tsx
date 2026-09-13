"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

type ImportResult = {
  updatedCount: number;
  skipped: { row: number; reason: string }[];
  parseErrors: string[];
  totalRows: number;
};

export default function BasilImportPage() {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadSample() {
    const res = await fetch("/api/basil/sample");
    setCsv(await res.text());
  }

  async function handleFile(file: File) {
    setCsv(await file.text());
  }

  async function runImport() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/basil/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Basil Import</h1>
        <p className="text-sm text-stone-500">
          Basil System Reconciliation &amp; File Import — PRD 7.4. This stub ships with mock/sample
          data; wire up real column mapping in{" "}
          <code className="rounded bg-stone-100 px-1">src/lib/services/basil.ts</code> once you have a
          real export.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Import a Basil export</h2>
          <div className="flex gap-2">
            <Button size="md" variant="secondary" onClick={loadSample}>
              Load sample data
            </Button>
            <label className="touch-target cursor-pointer rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium hover:bg-stone-100">
              Upload CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <textarea
            className="h-56 w-full rounded-lg border border-stone-300 p-3 font-mono text-xs focus:border-stone-900 focus:outline-none"
            placeholder="OrderItemID,ISBN13,PO Number,Status"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <Button disabled={!csv.trim() || loading} onClick={runImport}>
            {loading ? "Importing…" : "Run import"}
          </Button>
        </CardBody>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Import result</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p>
              Updated <span className="font-semibold">{result.updatedCount}</span> of{" "}
              {result.totalRows} rows.
            </p>
            {result.skipped.length > 0 && (
              <div>
                <p className="font-medium text-amber-700">Skipped rows:</p>
                <ul className="list-inside list-disc text-stone-500">
                  {result.skipped.map((s, i) => (
                    <li key={i}>
                      Row {s.row}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.parseErrors.length > 0 && (
              <div>
                <p className="font-medium text-red-700">Parse errors:</p>
                <ul className="list-inside list-disc text-stone-500">
                  {result.parseErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
