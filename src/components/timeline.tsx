"use client";

import { useMemo, useState } from "react";
import { exportEventInputPdf } from "@/lib/pdf/export-record";

import {
  Camera,
  ChevronDown,
  ChevronUp,
  FileDown,
  FileText,
  Loader2,
  ImageIcon,
  Inbox,
  Paperclip,
  Send,
  StickyNote,
} from "lucide-react";
import { EventTypeBadge } from "@/components/ui";
import {
  attachmentDataUrl,
  formatBytes,
  formatDateTime,
  formatDateTimeShort,
  isImageAttachment,
} from "@/lib/format";
import {
  EVENT_META,
  type ActionRequiredBy,
  type CaseStatus,
  type TimelineEvent,
} from "@/lib/types";

export interface TimelineCaseMeta {
  title: string;
  reference: string;
  department: string;
  location: string | null;
  actionRequiredBy: ActionRequiredBy;
  status: CaseStatus;
}

const DOT_TONE: Record<string, string> = {
  email_in: "bg-sky-100 text-sky-800 ring-sky-200",
  email_out: "bg-brand-soft text-brand-dark ring-teal-200",
  site_visit: "bg-amber-100 text-amber-800 ring-amber-200",
  internal_note: "bg-stone-100 text-stone-600 ring-stone-200",
};

function EventIcon({ type }: { type: TimelineEvent["eventType"] }) {
  const icon = EVENT_META[type].icon;
  if (icon === "inbox") return <Inbox className="size-4" strokeWidth={2} />;
  if (icon === "send") return <Send className="size-4" strokeWidth={2} />;
  if (icon === "camera") return <Camera className="size-4" strokeWidth={2} />;
  return <StickyNote className="size-4" strokeWidth={2} />;
}

export function Timeline({
  events,
  caseMeta,
}: {
  events: TimelineEvent[];
  caseMeta?: TimelineCaseMeta;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [exportingId, setExportingId] = useState<string | null>(null);

  async function exportEvent(event: TimelineEvent) {
    if (!caseMeta || exportingId) return;
    setExportingId(event.id);
    try {
      await exportEventInputPdf({
        caseTitle: caseMeta.title,
        caseReference: caseMeta.reference,
        department: caseMeta.department,
        location: caseMeta.location,
        eventDate: event.eventDate,
        eventType: event.eventType,
        description: event.description,
        fullContent: event.fullContent ?? undefined,
        attachmentNames: event.attachments.map((item) => item.name),
        currentAction: caseMeta.actionRequiredBy,
        currentStatus: caseMeta.status,
      });
    } catch (error) {
      console.error("[pdf export]", error);
    } finally {
      setExportingId(null);
    }
  }
  const expandableIds = useMemo(
    () => events.filter((event) => Boolean(event.fullContent?.trim())).map((event) => event.id),
    [events],
  );
  const allExpanded =
    expandableIds.length > 0 && expandableIds.every((id) => expanded.has(id));

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong/80 bg-paper/50 px-5 py-10 text-center">
        <p className="font-serif text-sm font-semibold text-ink">時間軸尚未開始</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-ink-muted">
          按下「新增跟進紀錄」，記錄第一封陳情信或政府回覆。建議把完整書面內容貼進「詳細全文」，日後可展開查閱。
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-ink-muted">
          共 {events.length} 則紀錄 · 依發生時間由新至舊排列
        </p>
        {expandableIds.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              setExpanded(allExpanded ? new Set() : new Set(expandableIds))
            }
            className="btn-quiet btn-sm"
          >
            {allExpanded ? (
              <ChevronUp className="size-3.5" strokeWidth={2.2} />
            ) : (
              <ChevronDown className="size-3.5" strokeWidth={2.2} />
            )}
            {allExpanded ? "收起全部全文" : "展開全部全文"}
          </button>
        ) : null}
      </div>

      <ol className="relative">
        {events.map((event, index) => {
          const isOpen = expanded.has(event.id);
          const hasFullContent = Boolean(event.fullContent?.trim());
          return (
            <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
              <div className="relative flex w-8 shrink-0 flex-col items-center">
                <span
                  className={`z-10 flex size-8 items-center justify-center rounded-full ring-4 ring-paper ${
                    DOT_TONE[event.eventType] ?? DOT_TONE.internal_note
                  }`}
                >
                  <EventIcon type={event.eventType} />
                </span>
                {index < events.length - 1 ? (
                  <span className="absolute bottom-[-16px] top-8 w-px bg-line-strong/70" />
                ) : null}
              </div>

              <article className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-3 transition hover:border-line-strong">
                <header className="flex flex-wrap items-center gap-2">
                  <EventTypeBadge type={event.eventType} />
                  <time
                    dateTime={event.eventDate}
                    className="font-mono text-[11px] tracking-tight text-ink-muted"
                    title={formatDateTime(event.eventDate)}
                  >
                    {formatDateTimeShort(event.eventDate)}
                  </time>
                  {index === 0 ? (
                    <span className="chip bg-brand text-white ring-brand">最新</span>
                  ) : null}
                  <span className="ml-auto inline-flex items-center gap-2">
                    {event.attachments.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-muted">
                        <Paperclip className="size-3" strokeWidth={2} />
                        {event.attachments.length} 個附件
                      </span>
                    ) : null}
                    {caseMeta ? (
                      <button
                        type="button"
                        onClick={() => exportEvent(event)}
                        disabled={exportingId !== null}
                        title="將此紀錄匯出為 A4 PDF"
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] text-ink-muted transition hover:bg-paper-deep hover:text-brand-dark disabled:opacity-60"
                      >
                        {exportingId === event.id ? (
                          <Loader2 className="size-3 animate-spin" strokeWidth={2.2} />
                        ) : (
                          <FileDown className="size-3" strokeWidth={2.2} />
                        )}
                        PDF
                      </button>
                    ) : null}
                  </span>
                </header>

                <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink">
                  {event.description}
                </p>

                {hasFullContent ? (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => toggle(event.id)}
                      aria-expanded={isOpen}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-paper/70 px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:border-brand/40 hover:text-brand-dark"
                    >
                      <FileText className="size-3.5" strokeWidth={2} />
                      {isOpen ? "收起全文" : "展開全文"}
                      {isOpen ? (
                        <ChevronUp className="size-3.5" strokeWidth={2.2} />
                      ) : (
                        <ChevronDown className="size-3.5" strokeWidth={2.2} />
                      )}
                    </button>

                    {isOpen ? (
                      <div className="mt-2.5 rounded-r-lg border-l-2 border-brand/40 bg-paper/70 px-3.5 py-3">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                          全文 / Full record
                        </p>
                        <p className="prose-long">{event.fullContent}</p>
                      </div>
                    ) : (
                      <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-muted">
                        {event.fullContent}
                      </p>
                    )}
                  </div>
                ) : null}

                {event.attachments.length > 0 ? (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {event.attachments.map((attachment) => (
                      <li key={`${attachment.name}-${attachment.sizeBytes}`}>
                        <a
                          href={attachmentDataUrl(attachment)}
                          download={attachment.name}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-[11px] text-ink-soft transition hover:border-brand/50 hover:text-brand-dark"
                          title={`${attachment.name}（${formatBytes(attachment.sizeBytes)}）`}
                        >
                          {isImageAttachment(attachment) ? (
                            <ImageIcon className="size-3.5 shrink-0 text-amber-600" strokeWidth={2} />
                          ) : (
                            <FileText className="size-3.5 shrink-0 text-rose-600" strokeWidth={2} />
                          )}
                          <span className="max-w-[170px] truncate">{attachment.name}</span>
                          <span className="font-mono text-[9.5px] text-ink-muted">
                            {formatBytes(attachment.sizeBytes)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
