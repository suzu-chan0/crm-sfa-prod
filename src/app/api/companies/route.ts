import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/companies
export async function GET() {
  const companies = await prisma.customerCompany.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(companies);
}

// POST /api/companies
export async function POST(request: NextRequest) {
  const body = await request.json();
  const name: string | undefined = body.name;

  if (!name || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const company = await prisma.customerCompany.create({
    data: { name: name.trim() },
  });

  return NextResponse.json(company, { status: 201 });
}
