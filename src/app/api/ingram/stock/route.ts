import { NextRequest, NextResponse } from "next/server";
import { checkIngramStock, checkIngramStockBatch } from "@/lib/services/ingram";

// GET /api/ingram/stock?isbn13=... — real-time stock query before placing/
// charging an order (PRD 3.2), and Kanban stock badges (PRD 7.3).
export async function GET(request: NextRequest) {
  const isbn13 = request.nextUrl.searchParams.get("isbn13");
  if (!isbn13) return NextResponse.json({ error: "isbn13 is required" }, { status: 400 });
  const result = await checkIngramStock(isbn13);
  return NextResponse.json({ result });
}

// POST /api/ingram/stock { isbns: string[] } — batch check for a Kanban board page load.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const isbns: string[] = Array.isArray(body?.isbns) ? body.isbns : [];
  const results = await checkIngramStockBatch(isbns);
  return NextResponse.json({ results });
}
