import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/deals/summary
// Returns: phase counts + total expected amount aggregation
export async function GET() {
  const where = { isDeleted: false };

  const [deals, aggregate] = await Promise.all([
    prisma.deal.findMany({
      where,
      select: { phase: true, expectedAmount: true },
    }),
    prisma.deal.aggregate({
      where,
      _sum: { expectedAmount: true },
      _count: true,
    }),
  ]);

  // Phase counts
  const phaseCounts: Record<string, number> = {};
  const phaseAmounts: Record<string, number> = {};
  for (const d of deals) {
    phaseCounts[d.phase] = (phaseCounts[d.phase] ?? 0) + 1;
    if (d.expectedAmount) {
      phaseAmounts[d.phase] =
        (phaseAmounts[d.phase] ?? 0) + Number(d.expectedAmount);
    }
  }

  return NextResponse.json({
    totalCount: aggregate._count,
    totalExpectedAmount: aggregate._sum.expectedAmount
      ? Number(aggregate._sum.expectedAmount)
      : 0,
    phaseCounts,
    phaseAmounts,
  });
}
