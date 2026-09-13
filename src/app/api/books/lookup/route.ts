import { NextRequest, NextResponse } from "next/server";
import { lookupBookMetadata } from "@/lib/services/openlibrary";

// GET /api/books/lookup?title=&author= — asynchronous background metadata
// lookup (PRD 3.2). Called from the register once Title, Author, and
// Binding are entered; must not block cashier order entry, so the client
// fires this in the background and merges results in when they land.
export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title")?.trim();
  const author = request.nextUrl.searchParams.get("author")?.trim() || undefined;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const result = await lookupBookMetadata({ title, author });
    return NextResponse.json({ result });
  } catch {
    // Network hiccups shouldn't block order entry — return a soft miss.
    return NextResponse.json({ result: null });
  }
}
