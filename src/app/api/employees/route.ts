import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/employees
export async function GET() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(employees);
}

// POST /api/employees
export async function POST(request: NextRequest) {
  const body = await request.json();
  const name: string | undefined = body.name;

  if (!name || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: {
      name: name.trim(),
      email: body.email ?? `${crypto.randomUUID()}@placeholder.local`,
      department: body.department ?? null,
      position: body.position ?? null,
      phone: body.phone ?? null,
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
