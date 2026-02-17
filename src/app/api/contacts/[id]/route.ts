import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/contacts/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contact = await prisma.customerContact.findUnique({
    where: { id },
    include: {
      customerCompany: { select: { id: true, name: true } },
    },
  });
  if (!contact || contact.isDeleted) {
    return NextResponse.json({ error: "contact not found" }, { status: 404 });
  }
  return NextResponse.json(contact);
}

// PATCH /api/contacts/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.customerContact.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ error: "contact not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (String(body.name).trim() === "") {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    data.name = String(body.name).trim();
  }
  if (body.department !== undefined) data.department = body.department || null;
  if (body.position !== undefined) data.position = body.position || null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.email !== undefined) data.email = body.email || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 }
    );
  }

  const updated = await prisma.customerContact.update({
    where: { id },
    data,
    include: {
      customerCompany: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/contacts/[id] (logical delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.customerContact.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ error: "contact not found" }, { status: 404 });
  }

  await prisma.customerContact.update({
    where: { id },
    data: { isDeleted: true },
  });

  return NextResponse.json({ message: "deleted" });
}
