/* -------------------------------------------------------------------------- */
/*  Domain types — mirror of the PostgreSQL schema (the single source of truth) */
/* -------------------------------------------------------------------------- */

export type CaseStatus =
  | "submitted"
  | "processing"
  | "replied_pending_user"
  | "appealing"
  | "closed";

export type ActionRequiredBy = "gov" | "user" | "none";

export type EventType =
  | "email_in"
  | "email_out"
  | "site_visit"
  | "internal_note";

export interface CaseRecord {
  id: string;
  govRefNumber: string | null;
  department: string;
  title: string;
  location: string | null;
  status: CaseStatus;
  actionRequiredBy: ActionRequiredBy;
  submissionDate: string;
  expectedReplyDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 附件一律以 Base64 文字存入 Neon（無任何外部儲存服務） */
export interface StoredAttachment {
  /** 原始檔名 */
  name: string;
  /** MIME type */
  mimeType: string;
  /** 原始檔案大小（bytes） */
  sizeBytes: number;
  /** Base64 編碼內容（不含 data: 前綴） */
  data: string;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  eventDate: string;
  eventType: EventType;
  description: string;
  fullContent: string | null;
  attachments: StoredAttachment[];
  createdAt: string;
}

export interface CaseWithEvents extends CaseRecord {
  events: TimelineEvent[];
}

export interface CaseSummary extends CaseRecord {
  eventCount: number;
  attachmentCount: number;
  lastEventAt: string | null;
  lastEventDescription: string | null;
  lastEventType: EventType | null;
}

/* -------------------------------------------------------------------------- */
/*  Presentation metadata                                                      */
/* -------------------------------------------------------------------------- */

export interface DepartmentMeta {
  code: string;
  name: string;
  short: string;
}

export const DEPARTMENTS: DepartmentMeta[] = [
  { code: "1823", name: "1823 政府熱線", short: "1823" },
  { code: "FEHD", name: "食物環境衞生署", short: "食環署" },
  { code: "HyD", name: "路政署", short: "路政署" },
  { code: "TD", name: "運輸署", short: "運輸署" },
  { code: "DO", name: "民政事務總署／民政事務處", short: "民政處" },
  { code: "HKPF", name: "香港警務處", short: "警務處" },
  { code: "LCSD", name: "康樂及文化事務署", short: "康文署" },
  { code: "WSD", name: "水務署", short: "水務署" },
  { code: "HKHA", name: "香港房屋委員會", short: "房委會" },
  { code: "EPD", name: "環境保護署", short: "環保署" },
  { code: "LandsD", name: "地政總署", short: "地政署" },
  { code: "BD", name: "屋宇署", short: "屋宇署" },
];

export const DEPARTMENT_MAP: Record<string, DepartmentMeta> = Object.fromEntries(
  DEPARTMENTS.map((department) => [department.code, department]),
);

export function departmentName(code: string): string {
  return DEPARTMENT_MAP[code]?.name ?? code;
}

export const CASE_STATUSES: CaseStatus[] = [
  "submitted",
  "processing",
  "replied_pending_user",
  "appealing",
  "closed",
];

export const STATUS_META: Record<
  CaseStatus,
  { label: string; description: string; badge: string; dot: string }
> = {
  submitted: {
    label: "已提交",
    description: "陳情文件已送達部門，等待正式立案。",
    badge: "bg-sky-50 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
  },
  processing: {
    label: "處理中",
    description: "政府部門已立案，正在跟進個案。",
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
  },
  replied_pending_user: {
    label: "待我方跟進",
    description: "政府已回覆，需要我們澄清、追問或存檔。",
    badge: "bg-violet-50 text-violet-800 ring-violet-200",
    dot: "bg-violet-500",
  },
  appealing: {
    label: "上訴／覆核",
    description: "已提出上訴、覆核或向申訴專員投訴。",
    badge: "bg-rose-50 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
  },
  closed: {
    label: "已結案",
    description: "個案已有最終結論並完成歸檔。",
    badge: "bg-stone-100 text-stone-600 ring-stone-300",
    dot: "bg-stone-400",
  },
};

export const ACTION_META: Record<
  ActionRequiredBy,
  { label: string; short: string; hint: string; badge: string }
> = {
  gov: {
    label: "等待政府回覆",
    short: "政府",
    hint: "發球權在部門手上：等待書面回覆或實地行動。",
    badge: "bg-teal-50 text-teal-900 ring-teal-200",
  },
  user: {
    label: "需要我跟進",
    short: "我方",
    hint: "發球權在我們手上：需追問、補交文件或確認內容。",
    badge: "bg-orange-50 text-orange-900 ring-orange-200",
  },
  none: {
    label: "已結案",
    short: "結案",
    hint: "無需任何一方採取行動。",
    badge: "bg-stone-100 text-stone-600 ring-stone-300",
  },
};

export const EVENT_META: Record<
  EventType,
  {
    label: string;
    short: string;
    direction: "in" | "out" | "internal";
    icon: "inbox" | "send" | "camera" | "note";
    dot: string;
    chip: string;
  }
> = {
  email_in: {
    label: "收到政府回信",
    short: "政府來函",
    direction: "in",
    icon: "inbox",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-800 ring-sky-200",
  },
  email_out: {
    label: "我方去信／陳情",
    short: "我方去信",
    direction: "out",
    icon: "send",
    dot: "bg-teal-700",
    chip: "bg-teal-50 text-teal-900 ring-teal-200",
  },
  site_visit: {
    label: "實地巡查",
    short: "實地巡查",
    direction: "internal",
    icon: "camera",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-900 ring-amber-200",
  },
  internal_note: {
    label: "內部筆記",
    short: "內部筆記",
    direction: "internal",
    icon: "note",
    dot: "bg-stone-400",
    chip: "bg-stone-100 text-stone-700 ring-stone-300",
  },
};

export const EVENT_TYPES: EventType[] = [
  "email_out",
  "email_in",
  "site_visit",
  "internal_note",
];

export const DEFAULT_STATUS_BY_ACTION: Record<ActionRequiredBy, CaseStatus> = {
  gov: "processing",
  user: "replied_pending_user",
  none: "closed",
};
