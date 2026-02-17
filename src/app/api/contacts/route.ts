import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/contacts
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const companyId = sp.get("companyId") || "";
  const q = sp.get("q")?.trim() || "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 20));

  const where: Prisma.CustomerContactWhereInput = { isDeleted: false };

  if (companyId) {
    where.customerCompanyId = companyId;
  }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { department: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const [total, contacts] = await Promise.all([
    prisma.customerContact.count({ where }),
    prisma.customerContact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customerCompany: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({ items: contacts, total, page, pageSize });
}

// POST /api/contacts
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name || String(body.name).trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.customerCompanyId) {
    return NextResponse.json(
      { error: "customerCompanyId is required" },
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

  const contact = await prisma.customerContact.create({
    data: {
      name: String(body.name).trim(),
      department: body.department || null,
      position: body.position || null,
      phone: body.phone || null,
      email: body.email || null,
      customerCompanyId: body.customerCompanyId,
    },
    include: {
      customerCompany: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
