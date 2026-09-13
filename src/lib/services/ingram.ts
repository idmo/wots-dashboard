// Ingram Book Company integration (PRD 3.2, 7.3). Real-time stock queries
// before placing/charging orders, and status badges in the back-office
// Kanban view.
//
// This stub ships with a realistic MOCK implementation so the app is fully
// usable end-to-end without Ingram credentials. Flip INGRAM_MOCK=false and
// fill in INGRAM_API_KEY / INGRAM_CLIENT_SECRET / INGRAM_ACCOUNT_NUMBER in
// .env once you have real Ingram iPage/API access, then implement
// `realIngramStockCheck` below against Ingram's actual API contract.

export type IngramStockResult = {
  isbn13: string;
  inStock: boolean;
  quantityAvailable: number;
  warehouse: string;
  estimatedRestockDays: number | null;
  source: "ingram-mock" | "ingram-live";
};

const MOCK_WAREHOUSES = ["La Vergne, TN", "Jackson, TN", "Roseburg, OR", "Fresno, CA"];

/** Deterministic pseudo-randomness so the same ISBN gives consistent mock results across calls. */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

function mockStockCheck(isbn13: string): IngramStockResult {
  const roll = seededRandom(isbn13);
  const inStock = roll > 0.25; // ~75% of titles in stock, like a real distributor mix
  const quantityAvailable = inStock ? Math.max(1, Math.round(roll * 40)) : 0;
  return {
    isbn13,
    inStock,
    quantityAvailable,
    warehouse: MOCK_WAREHOUSES[Math.floor(roll * MOCK_WAREHOUSES.length)],
    estimatedRestockDays: inStock ? null : Math.max(3, Math.round(roll * 21)),
    source: "ingram-mock",
  };
}

async function realIngramStockCheck(isbn13: string): Promise<IngramStockResult> {
  // TODO: implement against Ingram's iPage / Content & Inventory API once
  // INGRAM_API_KEY, INGRAM_CLIENT_SECRET, and INGRAM_ACCOUNT_NUMBER are
  // available. Keep credentials server-side only (this file must never be
  // imported from a Client Component).
  throw new Error(
    `Real Ingram integration is not implemented yet (requested stock for ISBN ${isbn13}). ` +
      "Set INGRAM_MOCK=true in .env to use mock data, or implement realIngramStockCheck() " +
      "in src/lib/services/ingram.ts."
  );
}

export function isIngramMockEnabled(): boolean {
  return process.env.INGRAM_MOCK !== "false";
}

export async function checkIngramStock(isbn13: string): Promise<IngramStockResult> {
  return isIngramMockEnabled() ? mockStockCheck(isbn13) : realIngramStockCheck(isbn13);
}

export async function checkIngramStockBatch(isbns: string[]): Promise<IngramStockResult[]> {
  return Promise.all(isbns.map(checkIngramStock));
}
