import { sql } from "drizzle-orm";
import {
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const caseStatusEnum = pgEnum("case_status", [
  "submitted",
  "processing",
  "replied_pending_user",
  "appealing",
  "closed",
]);

export const actionRequiredByEnum = pgEnum("action_required_by", [
  "gov",
  "user",
  "none",
]);

export const timelineEventTypeEnum = pgEnum("timeline_event_type", [
  "email_in",
  "email_out",
  "site_visit",
  "internal_note",
]);

/* -------------------------------------------------------------------------- */
/*  Attachment payload — Base64 text stored inside Neon (no external storage)  */
/* -------------------------------------------------------------------------- */

export interface StoredAttachment {
  /** 原始檔名，例如「政府回函.pdf」 */
  name: string;
  /** MIME type，例如 application/pdf 或 image/jpeg */
  mimeType: string;
  /** 原始檔案大小（bytes，未經 Base64） */
  sizeBytes: number;
  /** Base64 編碼的檔案內容（不含 data: 前綴） */
  data: string;
}

/* -------------------------------------------------------------------------- */
/*  cases                                                                      */
/* -------------------------------------------------------------------------- */

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    govRefNumber: varchar("gov_ref_number", { length: 50 }),
    department: varchar("department", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }),
    status: caseStatusEnum("status").notNull().default("submitted"),
    actionRequiredBy: actionRequiredByEnum("action_required_by")
      .notNull()
      .default("gov"),
    submissionDate: date("submission_date").notNull(),
    expectedReplyDate: date("expected_reply_date"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cases_department_idx").on(table.department),
    index("cases_action_required_by_idx").on(table.actionRequiredBy),
  ],
);

/* -------------------------------------------------------------------------- */
/*  timeline_events — attachments live here as Base64 JSON                     */
/* -------------------------------------------------------------------------- */

export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    eventDate: timestamp("event_date", { withTimezone: true, mode: "string" })
      .notNull(),
    eventType: timelineEventTypeEnum("event_type").notNull(),
    description: text("description").notNull(),
    fullContent: text("full_content"),
    /** 附件以 Base64 存放：[{ name, mimeType, sizeBytes, data }] */
    attachmentsBase64: jsonb("attachments_base64")
      .$type<StoredAttachment[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("timeline_events_case_id_idx").on(table.caseId),
    index("timeline_events_event_date_idx").on(table.eventDate),
  ],
);

export type CaseRow = typeof cases.$inferSelect;
export type TimelineEventRow = typeof timelineEvents.$inferSelect;
