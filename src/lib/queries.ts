import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cases, timelineEvents } from "@/db/schema";
import type {
  ActionRequiredBy,
  CaseRecord,
  CaseStatus,
  CaseSummary,
  CaseWithEvents,
  EventType,
  TimelineEvent,
} from "@/lib/types";

export interface CaseFilters {
  department?: string;
  status?: CaseStatus;
  action?: ActionRequiredBy;
  q?: string;
}

export interface DashboardStats {
  total: number;
  awaitingGov: number;
  awaitingUser: number;
  overdue: number;
  closed: number;
  events: number;
  attachments: number;
}

type CaseRowShape = typeof cases.$inferSelect;
type EventRowShape = typeof timelineEvents.$inferSelect;

function toCaseRecord(row: CaseRowShape): CaseRecord {
  return {
    id: row.id,
    govRefNumber: row.govRefNumber,
    department: row.department,
    title: row.title,
    location: row.location,
    status: row.status,
    actionRequiredBy: row.actionRequiredBy,
    submissionDate: row.submissionDate,
    expectedReplyDate: row.expectedReplyDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toTimelineEvent(row: EventRowShape): TimelineEvent {
  return {
    id: row.id,
    caseId: row.caseId,
    eventDate: row.eventDate,
    eventType: row.eventType,
    description: row.description,
    fullContent: row.fullContent,
    attachments: Array.isArray(row.attachmentsBase64) ? row.attachmentsBase64 : [],
    createdAt: row.createdAt,
  };
}

export async function listCases(
  filters: CaseFilters = {},
  options: { orderBy?: "updated" | "deadline" } = {},
): Promise<CaseSummary[]> {
  const conditions = [];
  if (filters.department) {
    conditions.push(eq(cases.department, filters.department));
  }
  if (filters.status) {
    conditions.push(eq(cases.status, filters.status));
  }
  if (filters.action) {
    conditions.push(eq(cases.actionRequiredBy, filters.action));
  }
  if (filters.q) {
    const term = `%${filters.q}%`;
    const search = or(
      ilike(cases.title, term),
      ilike(cases.location, term),
      ilike(cases.govRefNumber, term),
      ilike(cases.department, term),
    );
    if (search) conditions.push(search);
  }

  const rows = await db
    .select()
    .from(cases)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      options.orderBy === "deadline"
        ? asc(cases.expectedReplyDate)
        : desc(cases.updatedAt),
    );

  if (rows.length === 0) return [];

  const eventRows = await db
    .select({
      caseId: timelineEvents.caseId,
      eventDate: timelineEvents.eventDate,
      description: timelineEvents.description,
      eventType: timelineEvents.eventType,
      attachmentCount: sql<number>`coalesce(jsonb_array_length(${timelineEvents.attachmentsBase64}), 0)`,
    })
    .from(timelineEvents)
    .where(
      inArray(
        timelineEvents.caseId,
        rows.map((row) => row.id),
      ),
    );

  const groups = new Map<
    string,
    {
      count: number;
      attachments: number;
      lastEventAt: string | null;
      lastEventDescription: string | null;
      lastEventType: EventType | null;
    }
  >();
  for (const event of eventRows) {
    const current = groups.get(event.caseId) ?? {
      count: 0,
      attachments: 0,
      lastEventAt: null,
      lastEventDescription: null,
      lastEventType: null,
    };
    current.count += 1;
    current.attachments += Number(event.attachmentCount ?? 0);
    if (!current.lastEventAt || event.eventDate > current.lastEventAt) {
      current.lastEventAt = event.eventDate;
      current.lastEventDescription = event.description;
      current.lastEventType = event.eventType;
    }
    groups.set(event.caseId, current);
  }

  return rows.map((row) => ({
    ...toCaseRecord(row),
    eventCount: groups.get(row.id)?.count ?? 0,
    attachmentCount: groups.get(row.id)?.attachments ?? 0,
    lastEventAt: groups.get(row.id)?.lastEventAt ?? null,
    lastEventDescription: groups.get(row.id)?.lastEventDescription ?? null,
    lastEventType: groups.get(row.id)?.lastEventType ?? null,
  }));
}

export async function getCaseWithEvents(
  id: string,
): Promise<CaseWithEvents | null> {
  const [row] = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  if (!row) return null;

  const eventRows = await db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.caseId, id))
    .orderBy(desc(timelineEvents.eventDate), desc(timelineEvents.createdAt));

  return {
    ...toCaseRecord(row),
    events: eventRows.map(toTimelineEvent),
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [caseRows, eventRows] = await Promise.all([
    db.select().from(cases),
    db
      .select({
        attachmentCount: sql<number>`coalesce(jsonb_array_length(${timelineEvents.attachmentsBase64}), 0)`,
      })
      .from(timelineEvents),
  ]);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const attachments = eventRows.reduce(
    (total, event) => total + Number(event.attachmentCount ?? 0),
    0,
  );

  return {
    total: caseRows.length,
    awaitingGov: caseRows.filter((row) => row.actionRequiredBy === "gov").length,
    awaitingUser: caseRows.filter((row) => row.actionRequiredBy === "user")
      .length,
    overdue: caseRows.filter(
      (row) =>
        row.actionRequiredBy !== "none" &&
        row.expectedReplyDate !== null &&
        row.expectedReplyDate < today,
    ).length,
    closed: caseRows.filter((row) => row.status === "closed").length,
    events: eventRows.length,
    attachments,
  };
}
