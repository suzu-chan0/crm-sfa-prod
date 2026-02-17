import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const INCLUDE_RELATIONS = {
  deal: { select: { id: true, name: true } },
  customerCompany: { select: { id: true, name: true } },
  employee: { select: { id: true, name: true } },
} as const;

// GET /api/activities
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const dealId = sp.get("dealId") || "";
  const employeeId = sp.get("employeeId") || "";
  const method = sp.get("method") || "";
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 20));
  const sortBy = sp.get("sortBy") || "activityDate";
  const sortOrder = sp.get("sortOrder") === "asc" ? "asc" : "desc";

  const ALLOWED_SORT: Record<string, string> = {
    activityDate: "activityDate",
    createdAt: "createdAt",
  };
  const orderField = ALLOWED_SORT[sortBy] ?? "activityDate";

  const where: Prisma.ActivityHistoryWhereInput = { isDeleted: false };

  if (dealId) where.dealId = dealId;
  if (employeeId) where.employeeId = employeeId;
  if (method) where.method = method;
  if (dateFrom || dateTo) {
    where.activityDate = {};
    if (dateFrom) where.activityDate.gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      where.activityDate.lte = to;
    }
  }

  const [total, activities] = await Promise.all([
    prisma.activityHistory.count({ where }),
    prisma.activityHistory.findMany({
      where,
      orderBy: { [orderField]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: INCLUDE_RELATIONS,
    }),
  ]);

  return NextResponse.json({ items: activities, total, page, pageSize });
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
