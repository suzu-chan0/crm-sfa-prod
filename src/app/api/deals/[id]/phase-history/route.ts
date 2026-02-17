import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/deals/[id]/phase-history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || deal.isDeleted) {
    return NextResponse.json({ error: "deal not found" }, { status: 404 });
  }

  const history = await prisma.phaseChangeHistory.findMany({
    where: { dealId: id },
    orderBy: { changedAt: "desc" },
  });

  return NextResponse.json(history);
}
