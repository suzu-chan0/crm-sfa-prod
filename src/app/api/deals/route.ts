import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// GET /api/deals
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const employeeId = sp.get("employeeId") || "";
  const phase = sp.get("phase") || "";
  const importance = sp.get("importance") || "";
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";
  const stagnant = sp.get("stagnant") || "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 20));
  const sortBy = sp.get("sortBy") || "updatedAt";
  const sortOrder = sp.get("sortOrder") === "asc" ? "asc" : "desc";

  const ALLOWED_SORT: Record<string, string> = {
    updatedAt: "updatedAt",
    expectedAmount: "expectedAmount",
    probability: "probability",
    name: "name",
    createdAt: "createdAt",
  };
  const orderField = ALLOWED_SORT[sortBy] ?? "updatedAt";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where: Prisma.DealWhereInput = { isDeleted: false };

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { customerCompany: { name: { contains: q } } },
    ];
  }
  if (employeeId) where.employeeId = employeeId;
  if (phase) where.phase = phase;
  if (importance) where.importance = importance;

  // Period filter (on updatedAt)
  if (dateFrom || dateTo) {
    where.updatedAt = {};
    if (dateFrom) where.updatedAt.gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      where.updatedAt.lte = to;
    }
  }

  // Stagnation filter: deals with stagnationReason set
  if (stagnant === "true") {
    where.stagnationReason = { not: null };
  }

  const [total, deals] = await Promise.all([
    prisma.deal.count({ where }),
    prisma.deal.findMany({
      where,
      orderBy: { [orderField]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customerCompany: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
        activityHistories: {
          where: { isDeleted: false },
          orderBy: { activityDate: "desc" },
          take: 1,
          select: { activityDate: true },
        },
        todos: {
          where: { status: "NOT_STARTED" },
          select: { dueDate: true },
        },
      },
    }),
  ]);

  const items = deals.map((deal) => {
    const lastActivityDate =
      deal.activityHistories.length > 0
        ? deal.activityHistories[0].activityDate
        : null;

    const overdueTodoCount = deal.todos.filter(
      (t) => t.dueDate && t.dueDate < today
    ).length;

    const { activityHistories, todos, ...rest } = deal;
    return { ...rest, lastActivityDate, overdueTodoCount };
  });

  return NextResponse.json({ items, total, page, pageSize });
}

// POST /api/deals
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name || !body.customerCompanyId || !body.employeeId) {
    return NextResponse.json(
      { error: "name, customerCompanyId, employeeId are required" },
      { status: 400 }
    );
  }

  const company = await prisma.customerCompany.findUnique({
    where: { id: body.customerCompanyId },
  });
  if (!company) {
    return NextResponse.json(
      { error: "customerCompany not found" },
      { status: 404 }
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: body.employeeId },
  });
  if (!employee) {
    return NextResponse.json(
      { error: "employee not found" },
      { status: 404 }
    );
  }

  // Build data with optional quantity/price fields
  const data: Record<string, unknown> = {
    name: String(body.name).trim(),
    customerCompanyId: body.customerCompanyId,
    employeeId: body.employeeId,
    phase: body.phase ?? "MEETING",
    probability: body.probability ?? null,
    importance: body.importance ?? null,
    industry: body.industry ?? null,
    usage: body.usage ?? null,
  };

  if (body.expectedQuantity != null && body.expectedQuantity !== "") {
    data.expectedQuantity = new Decimal(body.expectedQuantity);
  }
  if (body.expectedUnitPrice != null && body.expectedUnitPrice !== "") {
    data.expectedUnitPrice = new Decimal(body.expectedUnitPrice);
  }

  // Auto-calculate expectedAmount
  if (data.expectedQuantity && data.expectedUnitPrice) {
    data.expectedAmount = (data.expectedQuantity as Decimal).mul(
      data.expectedUnitPrice as Decimal
    );
  }

  const deal = await prisma.deal.create({
    data,
    include: {
      customerCompany: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
