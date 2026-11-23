import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  GitCommitVertical,
  MapPin,
  Paperclip,
} from "lucide-react";
import {
  ActionBadge,
  DepartmentTag,
  EventTypeBadge,
  SlaBadge,
  StatusBadge,
} from "@/components/ui";
import { formatYmd, formatYmdShort } from "@/lib/format";
import type { CaseSummary } from "@/lib/types";

export function CaseRow({ caseRecord }: { caseRecord: CaseSummary }) {
  return (
    <Link
      href={`/cases/${caseRecord.id}`}
      className="group grid gap-3 border-b border-line/70 px-4 py-4 transition last:border-b-0 hover:bg-paper/60 sm:px-5 lg:grid-cols-[minmax(0,1fr)_208px] lg:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <DepartmentTag code={caseRecord.department} />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-muted">
            {caseRecord.govRefNumber ?? "未獲政府編號"}
          </span>
          <StatusBadge status={caseRecord.status} />
          {caseRecord.actionRequiredBy !== "none" ? (
            <SlaBadge
              expectedReplyDate={caseRecord.expectedReplyDate}
              actionRequiredBy={caseRecord.actionRequiredBy}
            />
          ) : null}
        </div>

        <h3 className="mt-2 font-serif text-[15.5px] font-semibold leading-snug tracking-tight text-ink transition group-hover:text-brand-dark">
          {caseRecord.title}
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-muted">
          {caseRecord.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" strokeWidth={1.9} />
              {caseRecord.location}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" strokeWidth={1.9} />
            立案 {formatYmd(caseRecord.submissionDate)}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitCommitVertical className="size-3.5" strokeWidth={1.9} />
            {caseRecord.eventCount} 則紀錄
          </span>
          <span className="inline-flex items-center gap-1">
            <Paperclip className="size-3.5" strokeWidth={1.9} />
            {caseRecord.attachmentCount} 個附件
          </span>
        </div>

        {caseRecord.lastEventDescription ? (
          <div className="mt-2.5 flex min-w-0 items-center gap-2">
            {caseRecord.lastEventType ? (
              <EventTypeBadge type={caseRecord.lastEventType} />
            ) : null}
            <p className="line-clamp-1 min-w-0 text-[12px] leading-relaxed text-ink-soft">
              {caseRecord.lastEventDescription}
            </p>
          </div>
        ) : (
          <p className="mt-2.5 text-[12px] italic text-ink-muted">
            尚未加入任何時間軸紀錄
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 lg:flex-col lg:items-end lg:gap-2">
        <ActionBadge action={caseRecord.actionRequiredBy} />
        <div className="flex items-center gap-2 text-[11px] text-ink-muted">
          {caseRecord.expectedReplyDate ? (
            <span>預計回覆 {formatYmdShort(caseRecord.expectedReplyDate)}</span>
          ) : (
            <span>未設預計回覆日</span>
          )}
          <ArrowUpRight
            className="size-3.5 text-ink-muted transition group-hover:text-brand"
            strokeWidth={2.2}
          />
        </div>
      </div>
    </Link>
  );
}
