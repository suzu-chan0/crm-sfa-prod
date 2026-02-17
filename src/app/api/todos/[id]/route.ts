import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INCLUDE_RELATIONS = {
  deal: { select: { id: true, name: true, phase: true } },
  customerCompany: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} as const;

// GET /api/todos/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const todo = await prisma.todo.findUnique({
    where: { id },
    include: INCLUDE_RELATIONS,
  });
  if (!todo) {
    return NextResponse.json({ error: "todo not found" }, { status: 404 });
  }
  return NextResponse.json(todo);
}

const VALID_STATUS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];
const VALID_PRIORITY = ["HIGH", "MEDIUM", "LOW"];
const VALID_TYPE = ["TODO", "NEXT_ACTION"];

// PATCH /api/todos/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.todo.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "todo not found" }, { status: 404 });
  }

  const errors: string[] = [];
  if (body.status !== undefined && !VALID_STATUS.includes(body.status)) {
    errors.push(`status must be one of: ${VALID_STATUS.join(", ")}`);
  }
  if (body.priority !== undefined && !VALID_PRIORITY.includes(body.priority)) {
    errors.push(`priority must be one of: ${VALID_PRIORITY.join(", ")}`);
  }
  if (body.type !== undefined && !VALID_TYPE.includes(body.type)) {
    errors.push(`type must be one of: ${VALID_TYPE.join(", ")}`);
  }
  if (body.title !== undefined && String(body.title).trim() === "") {
    errors.push("title cannot be empty");
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.type !== undefined) data.type = body.type;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.assigneeId !== undefined) {
    if (body.assigneeId) {
      const emp = await prisma.employee.findUnique({ where: { id: body.assigneeId } });
      if (!emp) {
        return NextResponse.json({ error: "assignee not found" }, { status: 404 });
      }
    }
    data.assigneeId = body.assigneeId || null;
  }

  // Status with completion tracking
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "COMPLETED") {
      data.completedAt = new Date();
    } else {
      data.completedAt = null;
      data.completedBy = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const updated = await prisma.todo.update({
    where: { id },
    data,
    include: INCLUDE_RELATIONS,
  });

  return NextResponse.json(updated);
}

// DELETE /api/todos/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.todo.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "todo not found" }, { status: 404 });
  }

  await prisma.todo.delete({ where: { id } });

  return NextResponse.json({ message: "deleted" });
}
