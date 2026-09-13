"use client";

import { Button } from "@/components/ui/Button";

// Triggers the browser's print dialog for the pickup slip page. Hidden
// via print:hidden so the button itself never ends up in the printout.
export function PrintButton() {
  return (
    <Button size="lg" onClick={() => window.print()} className="print:hidden">
      Print
    </Button>
  );
}
