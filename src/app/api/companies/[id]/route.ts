import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/companies/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const company = await prisma.customerCompany.findUnique({ where: { id } });
  if (!company || company.isDeleted) {
    return NextResponse.json({ error: "company not found" }, { status: 404 });
  }
  return NextResponse.json(company);
}

// PATCH /api/companies/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.customerCompany.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ error: "company not found" }, { status: 404 });
  }

  if (body.name !== undefined && String(body.name).trim() === "") {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.address !== undefined) data.address = body.address || null;
  if (body.industry !== undefined) data.industry = body.industry || null;
  if (body.usage !== undefined) data.usage = body.usage || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const updated = await prisma.customerCompany.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/companies/[id] (logical delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.customerCompany.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ error: "company not found" }, { status: 404 });
  }

  await prisma.customerCompany.update({
    where: { id },
    data: { isDeleted: true },
  });

  return NextResponse.json({ message: "deleted" });
}
