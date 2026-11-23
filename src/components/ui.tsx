import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Clock3, FileText, Inbox, Send, StickyNote, Camera } from "lucide-react";
import { getSlaInfo } from "@/lib/format";
import {
  ACTION_META,
  DEPARTMENT_MAP,
  EVENT_META,
  STATUS_META,
  departmentName,
  type ActionRequiredBy,
  type CaseStatus,
  type EventType,
} from "@/lib/types";

export function StatusBadge({ status }: { status: CaseStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`chip ${meta.badge}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function ActionBadge({
  action,
  withIcon = true,
}: {
  action: ActionRequiredBy;
  withIcon?: boolean;
}) {
  const meta = ACTION_META[action];
  return (
    <span className={`chip ${meta.badge}`}>
      {withIcon ? <Clock3 className="size-3" strokeWidth={2.2} /> : null}
      {meta.label}
    </span>
  );
}

export function DepartmentTag({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line-strong/80 bg-paper px-2 py-1 text-[11px] font-semibold tracking-wide text-ink">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
        {code}
      </span>
      <span className="hidden text-[11px] font-normal text-ink-soft sm:inline">
        {DEPARTMENT_MAP[code]?.short ?? departmentName(code)}
      </span>
    </span>
  );
}

export function SlaBadge({
  expectedReplyDate,
  actionRequiredBy,
}: {
  expectedReplyDate: string | null;
  actionRequiredBy: ActionRequiredBy;
}) {
  const sla = getSlaInfo(expectedReplyDate, actionRequiredBy);
  return (
    <span className={`chip ${sla.tone}`}>
      <span className={`size-1.5 rounded-full ${sla.bar}`} />
      SLA {sla.label}
    </span>
  );
}

export function EventTypeBadge({ type }: { type: EventType }) {
  const meta = EVENT_META[type];
  const Icon =
    meta.icon === "inbox"
      ? Inbox
      : meta.icon === "send"
        ? Send
        : meta.icon === "camera"
          ? Camera
          : StickyNote;
  return (
    <span className={`chip ${meta.chip}`}>
      <Icon className="size-3" strokeWidth={2.2} />
      {meta.label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  href,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: ReactNode;
  href?: string;
  tone?: "default" | "danger" | "warning" | "success" | "muted";
}) {
  const iconTone =
    tone === "danger"
      ? "bg-rose-100 text-rose-700"
      : tone === "warning"
        ? "bg-orange-100 text-orange-700"
        : tone === "success"
          ? "bg-teal-100 text-teal-800"
          : tone === "muted"
            ? "bg-stone-100 text-stone-600"
            : "bg-brand-soft text-brand-dark";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {label}
        </p>
        <span className={`flex size-8 items-center justify-center rounded-lg ${iconTone}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 font-serif text-[30px] font-semibold leading-none text-ink">
        {value}
      </p>
      <p className="mt-2 flex items-center gap-1 text-[11.5px] leading-relaxed text-ink-muted">
        {hint}
        {href ? <ArrowUpRight className="size-3" strokeWidth={2.2} /> : null}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="card group block px-4 py-4 transition hover:-translate-y-0.5 hover:border-line-strong"
      >
        {body}
      </Link>
    );
  }
  return <div className="card px-4 py-4">{body}</div>;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong/80 bg-paper/50 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
        {icon ?? <FileText className="size-5" strokeWidth={1.8} />}
      </span>
      <p className="font-serif text-base font-semibold text-ink">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-ink-muted">{description}</p>
      {action}
    </div>
  );
}

export function DataRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-3 py-2.5">
      <dt className="text-[11.5px] font-medium text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-[12.5px] leading-relaxed text-ink">{children}</dd>
    </div>
  );
}
