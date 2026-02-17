import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INCLUDE_RELATIONS = {
  deal: { select: { id: true, name: true } },
  customerCompany: { select: { id: true, name: true } },
  employee: { select: { id: true, name: true } },
} as const;

// GET /api/activities/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const activity = await prisma.activityHistory.findUnique({
    where: { id },
    include: INCLUDE_RELATIONS,
  });
  if (!activity || activity.isDeleted) {
    return NextResponse.json({ error: "activity not found" }, { status: 404 });
  }
  return NextResponse.json(activity);
}

// PATCH /api/activities/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.activityHistory.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ error: "activity not found" }, { status: 404 });
  }

  const VALID_METHODS = ["PHONE", "EMAIL", "VISIT", "ONLINE", "OTHER"];
  const errors: string[] = [];

  if (body.method !== undefined && !VALID_METHODS.includes(body.method)) {
    errors.push(`method must be one of: ${VALID_METHODS.join(", ")}`);
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.activityDate !== undefined) data.activityDate = new Date(body.activityDate);
  if (body.activityType !== undefined) data.activityType = body.activityType || null;
  if (body.method !== undefined) data.method = body.method;
  if (body.result !== undefined) data.result = body.result || null;
  if (body.memo !== undefined) data.memo = body.memo || null;
  if (body.isVisit !== undefined) data.isVisit = Boolean(body.isVisit);
  if (body.duration !== undefined) data.duration = body.duration ?? null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const updated = await prisma.activityHistory.update({
    where: { id },
    data,
    include: INCLUDE_RELATIONS,
  });

  return NextResponse.json(updated);
}

// DELETE /api/activities/[id] (logical delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.activityHistory.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ error: "activity not found" }, { status: 404 });
  }

  await prisma.activityHistory.update({
    where: { id },
    data: { isDeleted: true },
  });

  return NextResponse.json({ message: "deleted" });
}
