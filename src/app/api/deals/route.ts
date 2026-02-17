import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/deals
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const employeeId = sp.get("employeeId") || "";
  const phase = sp.get("phase") || "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 20));
  const sortBy = sp.get("sortBy") || "updatedAt";
  const sortOrder = sp.get("sortOrder") === "asc" ? "asc" : "desc";

  const ALLOWED_SORT: Record<string, string> = {
    updatedAt: "updatedAt",
    expectedAmount: "expectedAmount",
    probability: "probability",
    name: "name",
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
  if (employeeId) {
    where.employeeId = employeeId;
  }
  if (phase) {
    where.phase = phase;
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

  const deal = await prisma.deal.create({
    data: {
      name: String(body.name).trim(),
      customerCompanyId: body.customerCompanyId,
      employeeId: body.employeeId,
      phase: body.phase ?? "MEETING",
      probability: body.probability ?? null,
      importance: body.importance ?? null,
    },
    include: {
      customerCompany: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
