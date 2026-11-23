import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { getCaseWithEvents } from "@/lib/queries";
import { updateCaseSchema, firstZodError } from "@/lib/validation";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "案件編號格式不正確" }, { status: 400 });
  }
  const data = await getCaseWithEvents(id);
  if (!data) {
    return NextResponse.json({ error: "找不到案件" }, { status: 404 });
  }
  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "案件編號格式不正確" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "請求內容格式不正確" }, { status: 400 });
  }

  const parsed = updateCaseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  const fields = [
    "title",
    "department",
    "location",
    "govRefNumber",
    "status",
    "actionRequiredBy",
    "submissionDate",
    "expectedReplyDate",
  ] as const;
  for (const field of fields) {
    const value = parsed.data[field];
    if (value !== undefined) patch[field] = value === "" ? null : value;
  }

  try {
    const [updated] = await db
      .update(cases)
      .set(patch)
      .where(eq(cases.id, id))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "找不到案件" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/cases/:id]", error);
    return NextResponse.json({ error: "更新案件失敗" }, { status: 500 });
  }
}
