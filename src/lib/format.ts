import type { ActionRequiredBy, StoredAttachment } from "@/lib/types";

const HONG_KONG_TZ = "Asia/Hong_Kong";
const DAY_MS = 86_400_000;

export function todayYmd(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HONG_KONG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

function ymdToUtcMs(ymd: string): number {
  const [year, month, day] = ymd.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((ymdToUtcMs(to) - ymdToUtcMs(from)) / DAY_MS);
}

export function formatYmd(ymd: string | null | undefined): string {
  if (!ymd) return "未設定";
  const [year, month, day] = ymd.slice(0, 10).split("-");
  if (!year || !month || !day) return ymd;
  return `${Number(year)}年${Number(month)}月${Number(day)}日`;
}

export function formatYmdShort(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  return ymd.slice(0, 10);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "未設定";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HONG_KONG_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${Number(get("year"))}年${Number(get("month"))}月${Number(get("day"))}日 ${get("hour")}:${get("minute")}`;
}

export function formatDateTimeShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HONG_KONG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export function toDateTimeLocalValue(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HONG_KONG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(safe);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/* -------------------------------------------------------------------------- */
/*  SLA                                                                        */
/* -------------------------------------------------------------------------- */

export type SlaState =
  | "overdue"
  | "due_today"
  | "due_soon"
  | "on_track"
  | "closed"
  | "unset";

export interface SlaInfo {
  state: SlaState;
  days: number | null;
  label: string;
  tone: string;
  bar: string;
}

export function getSlaInfo(
  expectedReplyDate: string | null | undefined,
  actionRequiredBy: ActionRequiredBy,
): SlaInfo {
  if (actionRequiredBy === "none") {
    return {
      state: "closed",
      days: null,
      label: "已結案",
      tone: "bg-stone-100 text-stone-600 ring-stone-300",
      bar: "bg-stone-400",
    };
  }
  if (!expectedReplyDate) {
    return {
      state: "unset",
      days: null,
      label: "未設期限",
      tone: "bg-stone-100 text-stone-600 ring-stone-300",
      bar: "bg-stone-400",
    };
  }
  const days = daysBetween(todayYmd(), expectedReplyDate);
  if (days < 0) {
    return {
      state: "overdue",
      days,
      label: `逾期 ${Math.abs(days)} 日`,
      tone: "bg-rose-50 text-rose-800 ring-rose-200",
      bar: "bg-rose-500",
    };
  }
  if (days === 0) {
    return {
      state: "due_today",
      days,
      label: "今日到期",
      tone: "bg-orange-50 text-orange-800 ring-orange-200",
      bar: "bg-orange-500",
    };
  }
  if (days <= 7) {
    return {
      state: "due_soon",
      days,
      label: `剩 ${days} 日`,
      tone: "bg-amber-50 text-amber-900 ring-amber-200",
      bar: "bg-amber-500",
    };
  }
  return {
    state: "on_track",
    days,
    label: `剩 ${days} 日`,
    tone: "bg-teal-50 text-teal-900 ring-teal-200",
    bar: "bg-teal-600",
  };
}

export function isOverdue(
  expectedReplyDate: string | null | undefined,
  actionRequiredBy: ActionRequiredBy,
): boolean {
  return getSlaInfo(expectedReplyDate, actionRequiredBy).state === "overdue";
}

/* -------------------------------------------------------------------------- */
/*  Files                                                                     */
/* -------------------------------------------------------------------------- */

export function sanitizeFilename(input: string, fallback = "case"): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : fallback;
}

export function isImageAttachment(attachment: Pick<StoredAttachment, "mimeType" | "name">): boolean {
  return (
    attachment.mimeType.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|heic|heif|svg)$/i.test(attachment.name)
  );
}

/** 還原成 data: URL，供 <a download> 或 <img src> 直接使用 */
export function attachmentDataUrl(attachment: StoredAttachment): string {
  return `data:${attachment.mimeType || "application/octet-stream"};base64,${attachment.data}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function caseReference(caseRecord: {
  govRefNumber: string | null;
  id: string;
}): string {
  return caseRecord.govRefNumber ?? `CASE-${caseRecord.id.slice(0, 8).toUpperCase()}`;
}

export function zipNameFor(caseRecord: { govRefNumber: string | null; id: string; title: string }): string {
  return `${sanitizeFilename(caseReference(caseRecord))}_${sanitizeFilename(caseRecord.title, "案件")}_Attachments.zip`;
}
