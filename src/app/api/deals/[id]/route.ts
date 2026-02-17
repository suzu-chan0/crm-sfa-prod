import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/deals/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      customerCompany: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
      todos: {
        orderBy: { createdAt: "desc" },
      },
      activityHistories: {
        where: { isDeleted: false },
        orderBy: { activityDate: "desc" },
      },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "deal not found" }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivityDate =
    deal.activityHistories.length > 0
      ? deal.activityHistories[0].activityDate
      : null;

  const openTodoCount = deal.todos.filter(
    (t) => t.status === "NOT_STARTED"
  ).length;

  const overdueTodoCount = deal.todos.filter(
    (t) => t.status === "NOT_STARTED" && t.dueDate && t.dueDate < today
  ).length;

  return NextResponse.json({
    ...deal,
    lastActivityDate,
    openTodoCount,
    overdueTodoCount,
  });
}

const VALID_PHASES = [
  "MEETING",
  "SAMPLE_PROVIDED",
  "INITIAL_EVAL",
  "FULL_EVAL",
  "WON",
  "LOST",
];
const VALID_IMPORTANCE = ["HIGH", "MEDIUM", "LOW"];

// PATCH /api/deals/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ error: "deal not found" }, { status: 404 });
  }

  const errors: string[] = [];

  if (body.phase !== undefined && !VALID_PHASES.includes(body.phase)) {
    errors.push(`phase must be one of: ${VALID_PHASES.join(", ")}`);
  }
  if (body.probability !== undefined && body.probability !== null) {
    const p = Number(body.probability);
    if (!Number.isInteger(p) || p < 0 || p > 100) {
      errors.push("probability must be an integer between 0 and 100");
    }
  }
  if (body.importance !== undefined && body.importance !== null) {
    if (!VALID_IMPORTANCE.includes(body.importance)) {
      errors.push(`importance must be one of: ${VALID_IMPORTANCE.join(", ")}`);
    }
  }
  if (body.stagnationReason !== undefined && body.stagnationReason !== null) {
    if (typeof body.stagnationReason !== "string") {
      errors.push("stagnationReason must be a string");
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.phase !== undefined) data.phase = body.phase;
  if (body.probability !== undefined)
    data.probability = body.probability === null ? null : Number(body.probability);
  if (body.importance !== undefined)
    data.importance = body.importance || null;
  if (body.stagnationReason !== undefined)
    data.stagnationReason = body.stagnationReason || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 }
    );
  }

  const updated = await prisma.deal.update({
    where: { id },
    data,
    include: {
      customerCompany: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
