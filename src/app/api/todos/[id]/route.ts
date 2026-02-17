import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/todos/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const status: string | undefined = body.status;
  if (status !== "COMPLETED" && status !== "NOT_STARTED") {
    return NextResponse.json(
      { error: "status must be 'NOT_STARTED' or 'COMPLETED'" },
      { status: 400 }
    );
  }

  const existing = await prisma.todo.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "todo not found" }, { status: 404 });
  }

  const todo = await prisma.todo.update({
    where: { id },
    data:
      status === "COMPLETED"
        ? { status: "COMPLETED", completedAt: new Date(), completedBy: null }
        : { status: "NOT_STARTED", completedAt: null, completedBy: null },
  });

  return NextResponse.json(todo);
}
