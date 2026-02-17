import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/companies
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const industry = sp.get("industry") || "";
  const usage = sp.get("usage") || "";

  const where: Prisma.CustomerCompanyWhereInput = { isDeleted: false };

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { address: { contains: q } },
    ];
  }
  if (industry) where.industry = industry;
  if (usage) where.usage = usage;

  const companies = await prisma.customerCompany.findMany({
    where,
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
    data: {
      name: name.trim(),
      address: body.address || null,
      industry: body.industry || null,
      usage: body.usage || null,
    },
  });

  return NextResponse.json(company, { status: 201 });
}
