import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INCLUDE_RELATIONS = {
  deal: { select: { id: true, name: true } },
  customerCompany: { select: { id: true, name: true } },
  employee: { select: { id: true, name: true } },
} as const;

// GET /api/activities
export async function GET() {
  const activities = await prisma.activityHistory.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: INCLUDE_RELATIONS,
  });
  return NextResponse.json(activities);
}

// POST /api/activities
export async function POST(request: NextRequest) {
  const body = await request.json();

  // 必須チェック
  const missing: string[] = [];
  if (!body.activityDate) missing.push("activityDate");
  if (!body.activityType) missing.push("activityType");
  if (!body.method) missing.push("method");
  if (!body.result) missing.push("result");
  if (!body.dealId) missing.push("dealId");
  if (!body.customerCompanyId) missing.push("customerCompanyId");
  if (!body.employeeId) missing.push("employeeId");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  // FK 存在チェック
  const deal = await prisma.deal.findUnique({
    where: { id: body.dealId },
  });
  if (!deal) {
    return NextResponse.json({ error: "deal not found" }, { status: 404 });
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

  const employee = await prisma.employee.findUnique({
    where: { id: body.employeeId },
  });
  if (!employee) {
    return NextResponse.json(
      { error: "employee not found" },
      { status: 404 }
    );
  }

  const activity = await prisma.activityHistory.create({
    data: {
      activityDate: new Date(body.activityDate),
      activityType: body.activityType,
      method: body.method,
      isVisit: body.isVisit ?? false,
      result: body.result,
      memo: body.memo ?? null,
      duration: body.duration ?? null,
      dealId: body.dealId,
      customerCompanyId: body.customerCompanyId,
      employeeId: body.employeeId,
    },
    include: INCLUDE_RELATIONS,
  });

  return NextResponse.json(activity, { status: 201 });
}
