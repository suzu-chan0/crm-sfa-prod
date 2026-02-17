import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

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

  if (!deal || deal.isDeleted) {
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
  // FK validation
  if (body.customerCompanyId !== undefined) {
    const co = await prisma.customerCompany.findUnique({
      where: { id: body.customerCompanyId },
    });
    if (!co) errors.push("customerCompany not found");
  }
  if (body.employeeId !== undefined) {
    const emp = await prisma.employee.findUnique({
      where: { id: body.employeeId },
    });
    if (!emp) errors.push("employee not found");
  }
  // Decimal validation
  if (body.expectedQuantity !== undefined && body.expectedQuantity !== null) {
    if (isNaN(Number(body.expectedQuantity)) || Number(body.expectedQuantity) < 0) {
      errors.push("expectedQuantity must be a non-negative number");
    }
  }
  if (body.expectedUnitPrice !== undefined && body.expectedUnitPrice !== null) {
    if (isNaN(Number(body.expectedUnitPrice)) || Number(body.expectedUnitPrice) < 0) {
      errors.push("expectedUnitPrice must be a non-negative number");
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
  if (body.customerCompanyId !== undefined)
    data.customerCompanyId = body.customerCompanyId;
  if (body.employeeId !== undefined)
    data.employeeId = body.employeeId;
  if (body.expectedQuantity !== undefined)
    data.expectedQuantity =
      body.expectedQuantity === null ? null : new Decimal(body.expectedQuantity);
  if (body.expectedUnitPrice !== undefined)
    data.expectedUnitPrice =
      body.expectedUnitPrice === null ? null : new Decimal(body.expectedUnitPrice);

  // Auto-calculate expectedAmount (SR-008-04-05)
  const qty =
    body.expectedQuantity !== undefined
      ? body.expectedQuantity
      : existing.expectedQuantity?.toString() ?? null;
  const price =
    body.expectedUnitPrice !== undefined
      ? body.expectedUnitPrice
      : existing.expectedUnitPrice?.toString() ?? null;

  if (qty !== null && price !== null && qty !== "" && price !== "") {
    data.expectedAmount = new Decimal(qty).mul(new Decimal(price));
  } else if (body.expectedQuantity === null || body.expectedUnitPrice === null) {
    data.expectedAmount = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 }
    );
  }

  // Record phase change history
  const phaseChanged = body.phase !== undefined && body.phase !== existing.phase;

  const updated = await prisma.deal.update({
    where: { id },
    data,
    include: {
      customerCompany: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  if (phaseChanged) {
    await prisma.phaseChangeHistory.create({
      data: {
        dealId: id,
        fromPhase: existing.phase,
        toPhase: body.phase,
      },
    });
  }

  return NextResponse.json(updated);
}

// DELETE /api/deals/[id] (logical delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ error: "deal not found" }, { status: 404 });
  }

  await prisma.deal.update({
    where: { id },
    data: { isDeleted: true },
  });

  return NextResponse.json({ message: "deleted" });
}
