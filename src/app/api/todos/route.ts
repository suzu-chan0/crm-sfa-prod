import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INCLUDE_RELATIONS = {
  deal: { select: { id: true, name: true } },
  customerCompany: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} as const;

// GET /api/todos
export async function GET() {
  const todos = await prisma.todo.findMany({
    orderBy: { createdAt: "desc" },
    include: INCLUDE_RELATIONS,
  });
  return NextResponse.json(todos);
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
