import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/employees/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    return NextResponse.json({ error: "employee not found" }, { status: 404 });
  }
  return NextResponse.json(employee);
}

// PATCH /api/employees/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "employee not found" }, { status: 404 });
  }

  if (body.name !== undefined && String(body.name).trim() === "") {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }
  if (body.email !== undefined && String(body.email).trim() === "") {
    return NextResponse.json({ error: "email cannot be empty" }, { status: 400 });
  }

  // Email uniqueness check
  if (body.email !== undefined) {
    const emailTrimmed = String(body.email).trim();
    const dup = await prisma.employee.findUnique({ where: { email: emailTrimmed } });
    if (dup && dup.id !== id) {
      return NextResponse.json({ error: "email already exists" }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.email !== undefined) data.email = String(body.email).trim();
  if (body.department !== undefined) data.department = body.department || null;
  if (body.position !== undefined) data.position = body.position || null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const updated = await prisma.employee.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
