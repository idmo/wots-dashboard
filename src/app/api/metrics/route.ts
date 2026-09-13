import { NextResponse } from "next/server";
import { computeDashboardMetrics } from "@/lib/domain/metrics";

// GET /api/metrics — Dashboard Overview & Metrics Rollups (PRD 7.2):
// order totals/trends, genre & author analytics, customer reliability.
export async function GET() {
  const metrics = await computeDashboardMetrics();
  return NextResponse.json(metrics);
}
