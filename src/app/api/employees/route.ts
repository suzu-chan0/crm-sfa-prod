import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/employees
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const includeInactive = sp.get("includeInactive") === "true";

  const employees = await prisma.employee.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(employees);
}

// POST /api/employees
export async function POST(request: NextRequest) {
  const body = await request.json();
  const name: string | undefined = body.name;
  const email: string | undefined = body.email;

  const missing: string[] = [];
  if (!name || name.trim() === "") missing.push("name");
  if (!email || email.trim() === "") missing.push("email");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const emailTrimmed = email!.trim();

  const dup = await prisma.employee.findUnique({ where: { email: emailTrimmed } });
  if (dup) {
    return NextResponse.json({ error: "email already exists" }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: {
      name: name!.trim(),
      email: emailTrimmed,
      department: body.department || null,
      position: body.position || null,
      phone: body.phone || null,
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
