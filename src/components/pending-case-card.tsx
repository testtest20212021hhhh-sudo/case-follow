import Link from "next/link";
import { ArrowRight, CalendarClock, MapPin, Timer } from "lucide-react";
import { DepartmentTag, EventTypeBadge, SlaBadge, StatusBadge } from "@/components/ui";
import {
  daysBetween,
  formatYmd,
  formatYmdShort,
  getSlaInfo,
  todayYmd,
} from "@/lib/format";
import type { CaseSummary } from "@/lib/types";

export function PendingCaseCard({
  caseRecord,
  emphasis,
}: {
  caseRecord: CaseSummary;
  emphasis: "gov" | "user";
}) {
  const sla = getSlaInfo(caseRecord.expectedReplyDate, caseRecord.actionRequiredBy);
  const overdue = sla.state === "overdue";
  const waitingDays = daysBetween(caseRecord.submissionDate, todayYmd());

  return (
    <Link
      href={`/cases/${caseRecord.id}`}
      className={`group relative block overflow-hidden rounded-2xl border bg-surface p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-30px_rgba(22,33,31,0.7)] ${
        overdue
          ? "border-rose-200 hover:border-rose-300"
          : emphasis === "user"
            ? "border-orange-200/80 hover:border-orange-300"
            : "border-line hover:border-line-strong"
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-[3px] ${
          overdue ? "bg-rose-500" : emphasis === "user" ? "bg-orange-400" : "bg-teal-600"
        }`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <DepartmentTag code={caseRecord.department} />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-muted">
          {caseRecord.govRefNumber ?? "未獲政府編號"}
        </span>
        <StatusBadge status={caseRecord.status} />
        <span className="ml-auto">
          <SlaBadge
            expectedReplyDate={caseRecord.expectedReplyDate}
            actionRequiredBy={caseRecord.actionRequiredBy}
          />
        </span>
      </div>

      <h3 className="mt-2.5 font-serif text-[15px] font-semibold leading-snug text-ink transition group-hover:text-brand-dark">
        {caseRecord.title}
      </h3>

      <p className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-muted">
        <MapPin className="size-3.5 shrink-0" strokeWidth={1.9} />
        {caseRecord.location ?? "未填寫地點"}
      </p>

      <div className="mt-3 rounded-xl border border-line/70 bg-paper/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {caseRecord.lastEventType ? (
              <EventTypeBadge type={caseRecord.lastEventType} />
            ) : null}
            <span className="truncate text-[10.5px] text-ink-muted">
              {caseRecord.lastEventAt ? formatYmd(caseRecord.lastEventAt) : "尚無紀錄"}
            </span>
          </div>
          <span className="shrink-0 text-[10.5px] font-medium text-ink-muted">
            {caseRecord.eventCount} 則 · {caseRecord.attachmentCount} 附件
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-soft">
          {caseRecord.lastEventDescription ?? "尚未加入任何跟進紀錄。"}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="size-3.5" strokeWidth={1.9} />
          立案 {formatYmd(caseRecord.submissionDate)} · 預計回覆{" "}
          {formatYmdShort(caseRecord.expectedReplyDate)}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-ink-soft">
          <Timer className="size-3.5" strokeWidth={1.9} />
          {emphasis === "gov" ? `已等待 ${waitingDays} 日` : "等待我方行動"}
          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:text-brand" strokeWidth={2.2} />
        </span>
      </div>
    </Link>
  );
}
