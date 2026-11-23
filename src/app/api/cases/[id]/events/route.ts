import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cases, timelineEvents } from "@/db/schema";
import { toTimelineEvent } from "@/lib/queries";
import { createEventSchema, firstZodError } from "@/lib/validation";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toHongKongIso(value: string): string {
  const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? new Date(`${value}:00+08:00`)
    : new Date(value);
  return local.toISOString();
}

export async function POST(
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

  const parsed = createEventSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const [caseRow] = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.id, id))
      .limit(1);
    if (!caseRow) {
      return NextResponse.json({ error: "找不到案件" }, { status: 404 });
    }

    const [created] = await db
      .insert(timelineEvents)
      .values({
        caseId: id,
        eventDate: toHongKongIso(parsed.data.eventDate),
        eventType: parsed.data.eventType,
        description: parsed.data.description,
        fullContent: parsed.data.fullContent ?? null,
        attachmentsBase64: parsed.data.attachments,
      })
      .returning();

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (parsed.data.actionRequiredBy) {
      patch.actionRequiredBy = parsed.data.actionRequiredBy;
    }
    if (parsed.data.status) {
      patch.status = parsed.data.status;
    }

    const [updatedCase] = await db
      .update(cases)
      .set(patch)
      .where(eq(cases.id, id))
      .returning();

    return NextResponse.json(
      {
        data: {
          event: toTimelineEvent(created),
          case: updatedCase,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/cases/:id/events]", error);
    return NextResponse.json({ error: "新增跟進紀錄失敗" }, { status: 500 });
  }
}
