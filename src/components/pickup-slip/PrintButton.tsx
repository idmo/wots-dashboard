"use client";

import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button size="lg" onClick={() => window.print()} className="print:hidden">
      Print
    </Button>
  );
}
