import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const INCLUDE_RELATIONS = {
  deal: { select: { id: true, name: true, phase: true } },
  customerCompany: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} as const;

// GET /api/todos
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const status = sp.get("status") || "";
  const priority = sp.get("priority") || "";
  const assigneeId = sp.get("assigneeId") || "";
  const companyId = sp.get("companyId") || "";
  const dealPhase = sp.get("dealPhase") || "";
  const dueDateFrom = sp.get("dueDateFrom") || "";
  const dueDateTo = sp.get("dueDateTo") || "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 20));
  const sortBy = sp.get("sortBy") || "createdAt";
  const sortOrder = sp.get("sortOrder") === "asc" ? "asc" : "desc";

  const ALLOWED_SORT: Record<string, string> = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    dueDate: "dueDate",
    priority: "priority",
  };
  const orderField = ALLOWED_SORT[sortBy] ?? "createdAt";

  const where: Prisma.TodoWhereInput = {};

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (companyId) where.customerCompanyId = companyId;
  if (dealPhase) {
    where.deal = { phase: dealPhase };
  }
  if (dueDateFrom || dueDateTo) {
    where.dueDate = {};
    if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
    if (dueDateTo) {
      const to = new Date(dueDateTo);
      to.setHours(23, 59, 59, 999);
      where.dueDate.lte = to;
    }
  }

  const [total, todos] = await Promise.all([
    prisma.todo.count({ where }),
    prisma.todo.findMany({
      where,
      orderBy: { [orderField]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: INCLUDE_RELATIONS,
    }),
  ]);

  return NextResponse.json({ items: todos, total, page, pageSize });
}

// POST /api/todos
export async function POST(request: NextRequest) {
  const body = await request.json();

  const missing: string[] = [];
  if (!body.title) missing.push("title");
  if (!body.dueDate) missing.push("dueDate");
  if (!body.status) missing.push("status");
  if (!body.priority) missing.push("priority");
  if (!body.type) missing.push("type");
  if (!body.dealId) missing.push("dealId");
  if (!body.customerCompanyId) missing.push("customerCompanyId");
  if (!body.assigneeId) missing.push("assigneeId");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const deal = await prisma.deal.findUnique({ where: { id: body.dealId } });
  if (!deal) {
    return NextResponse.json({ error: "deal not found" }, { status: 404 });
  }

  const company = await prisma.customerCompany.findUnique({
    where: { id: body.customerCompanyId },
  });
  if (!company) {
    return NextResponse.json({ error: "customerCompany not found" }, { status: 404 });
  }

  const assignee = await prisma.employee.findUnique({
    where: { id: body.assigneeId },
  });
  if (!assignee) {
    return NextResponse.json({ error: "assignee not found" }, { status: 404 });
  }

  const todo = await prisma.todo.create({
    data: {
      title: String(body.title).trim(),
      description: body.description ?? null,
      dueDate: new Date(body.dueDate),
      status: body.status,
      priority: body.priority,
      type: body.type,
      startDate: body.startDate ? new Date(body.startDate) : null,
      dealId: body.dealId,
      customerCompanyId: body.customerCompanyId,
      assigneeId: body.assigneeId,
    },
    include: INCLUDE_RELATIONS,
  });

  return NextResponse.json(todo, { status: 201 });
}
