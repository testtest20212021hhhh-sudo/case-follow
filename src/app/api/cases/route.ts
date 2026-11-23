import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { listCases } from "@/lib/queries";
import { ensureSeeded } from "@/lib/seed";
import type { ActionRequiredBy, CaseStatus } from "@/lib/types";
import { CASE_STATUSES } from "@/lib/types";
import { createCaseSchema, firstZodError } from "@/lib/validation";

export const dynamic = "force-dynamic";

const ACTIONS: ActionRequiredBy[] = ["gov", "user", "none"];

export async function GET(request: Request) {
  await ensureSeeded();
  const url = new URL(request.url);
  const department = url.searchParams.get("department") ?? undefined;
  const statusParam = url.searchParams.get("status");
  const actionParam = url.searchParams.get("action");
  const q = url.searchParams.get("q") ?? undefined;

  const status = CASE_STATUSES.includes(statusParam as CaseStatus)
    ? (statusParam as CaseStatus)
    : undefined;
  const action = ACTIONS.includes(actionParam as ActionRequiredBy)
    ? (actionParam as ActionRequiredBy)
    : undefined;

  try {
    const data = await listCases({ department, status, action, q });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/cases]", error);
    return NextResponse.json({ error: "無法讀取案件列表" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "請求內容格式不正確" }, { status: 400 });
  }

  const parsed = createCaseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const [created] = await db
      .insert(cases)
      .values({
        title: parsed.data.title,
        department: parsed.data.department,
        location: parsed.data.location ?? null,
        govRefNumber: parsed.data.govRefNumber ?? null,
        status: parsed.data.status,
        actionRequiredBy: parsed.data.actionRequiredBy,
        submissionDate: parsed.data.submissionDate,
        expectedReplyDate: parsed.data.expectedReplyDate ?? null,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cases]", error);
    return NextResponse.json({ error: "建立案件失敗" }, { status: 500 });
  }
}
