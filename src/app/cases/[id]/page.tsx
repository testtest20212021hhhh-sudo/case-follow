import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  FileText,
  GitCommitVertical,
  ImageIcon,
  MapPin,
  Paperclip,
} from "lucide-react";
import { BallInCourtControl } from "@/components/ball-in-court-control";
import { CaseToolbar } from "@/components/case-toolbar";
import { Timeline } from "@/components/timeline";
import {
  ActionBadge,
  DataRow,
  DepartmentTag,
  EventTypeBadge,
  SlaBadge,
  StatusBadge,
} from "@/components/ui";
import {
  attachmentDataUrl,
  caseReference,
  daysBetween,
  formatBytes,
  formatDateTime,
  formatYmd,
  formatYmdShort,
  getSlaInfo,
  isImageAttachment,
  todayYmd,
} from "@/lib/format";
import { getCaseWithEvents } from "@/lib/queries";
import { ensureSeeded } from "@/lib/seed";
import {
  ACTION_META,
  EVENT_TYPES,
  STATUS_META,
  departmentName,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureSeeded();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const caseRecord = await getCaseWithEvents(id);
  if (!caseRecord) notFound();

  const sla = getSlaInfo(caseRecord.expectedReplyDate, caseRecord.actionRequiredBy);
  const today = todayYmd();
  const elapsed = Math.max(0, daysBetween(caseRecord.submissionDate, today));
  const windowDays = caseRecord.expectedReplyDate
    ? Math.max(1, daysBetween(caseRecord.submissionDate, caseRecord.expectedReplyDate))
    : null;
  const progress =
    windowDays === null ? 0 : Math.min(100, Math.round((elapsed / windowDays) * 100));

  const events = caseRecord.events;
  const attachments = [...events]
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .flatMap((event) =>
      event.attachments.map((attachment) => ({
        ...attachment,
        eventDate: event.eventDate,
        eventType: event.eventType,
      })),
    );

  const eventCounts = EVENT_TYPES.map((type) => ({
    type,
    count: events.filter((event) => event.eventType === type).length,
  })).filter((entry) => entry.count > 0);

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
        <Link href="/" className="transition hover:text-ink">
          所有案件
        </Link>
        <ChevronRight className="size-3" strokeWidth={2} />
        <Link href="/cases/pending" className="transition hover:text-ink">
          待辦
        </Link>
        <ChevronRight className="size-3" strokeWidth={2} />
        <span className="truncate text-ink">{caseReference(caseRecord)}</span>
      </nav>

      {/* Case header */}
      <header className="card overflow-hidden">
        <div className="paper-grid border-b border-line px-4 py-4 sm:px-6 sm:py-5">
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
            <span className="ml-auto hidden text-[10.5px] text-ink-muted sm:block">
              最後更新 {formatDateTime(caseRecord.updatedAt)}
            </span>
          </div>

          <h1 className="mt-2.5 max-w-3xl font-serif text-[23px] font-semibold leading-snug tracking-tight text-ink sm:text-[30px]">
            {caseRecord.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-muted">
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
              <CalendarClock className="size-3.5" strokeWidth={1.9} />
              預計回覆 {formatYmd(caseRecord.expectedReplyDate)}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitCommitVertical className="size-3.5" strokeWidth={1.9} />
              {events.length} 則紀錄
            </span>
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3.5" strokeWidth={1.9} />
              {attachments.length} 個附件
            </span>
          </div>

          <div className="mt-4">
            <CaseToolbar caseRecord={caseRecord} events={events} />
          </div>
        </div>

        {/* SLA strip */}
        <div className="bg-surface px-4 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
              <CalendarClock className="size-3.5 text-ink-muted" strokeWidth={2} />
              回覆期限追蹤
              <span className="font-mono text-[11px] font-normal text-ink-muted">
                {formatYmdShort(caseRecord.expectedReplyDate)}
              </span>
            </p>
            <span className={`chip ${sla.tone}`}>
              <span className={`size-1.5 rounded-full ${sla.bar}`} />
              {sla.label}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line/70">
            <div
              className={`h-full rounded-full ${sla.bar}`}
              style={{ width: `${windowDays === null ? 0 : Math.max(4, progress)}%` }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10.5px] text-ink-muted">
            <span>
              由立案日起已過 {elapsed} 日
              {windowDays ? `，原定 SLA 期限為 ${windowDays} 日` : "，尚未設定 SLA 期限"}
            </span>
            <span>
              狀態：{STATUS_META[caseRecord.status].label} · 發球權：
              {ACTION_META[caseRecord.actionRequiredBy].short}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[318px_minmax(0,1fr)] lg:items-start">
        {/* Left rail */}
        <div className="space-y-3 lg:sticky lg:top-28">
          <BallInCourtControl
            caseId={caseRecord.id}
            currentAction={caseRecord.actionRequiredBy}
            currentStatus={caseRecord.status}
          />

          <div className="card px-3.5 py-3.5">
            <p className="panel-label">
              <FileText className="size-3.5" strokeWidth={2} />
              案件基本資料
            </p>
            <dl className="mt-1.5 divide-y divide-line/70">
              <DataRow label="案件編號">
                <span className="font-mono text-[11.5px]">{caseReference(caseRecord)}</span>
              </DataRow>
              <DataRow label="負責部門">
                {departmentName(caseRecord.department)}
                <span className="ml-1 font-mono text-[10px] uppercase text-ink-muted">
                  ({caseRecord.department})
                </span>
              </DataRow>
              <DataRow label="政府編號">
                <span className="font-mono text-[11.5px]">
                  {caseRecord.govRefNumber ?? "未提供"}
                </span>
              </DataRow>
              <DataRow label="地點">{caseRecord.location ?? "未填寫"}</DataRow>
              <DataRow label="立案日期">{formatYmd(caseRecord.submissionDate)}</DataRow>
              <DataRow label="預計回覆">
                {formatYmd(caseRecord.expectedReplyDate)}
              </DataRow>
              <DataRow label="目前狀態">
                <StatusBadge status={caseRecord.status} />
              </DataRow>
              <DataRow label="發球權">
                <ActionBadge action={caseRecord.actionRequiredBy} />
              </DataRow>
              <DataRow label="最後更新">
                <span className="text-[11.5px]">
                  {formatDateTime(caseRecord.updatedAt)}
                </span>
              </DataRow>
            </dl>
            <p className="mt-2 rounded-lg bg-paper/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-ink-muted">
              {STATUS_META[caseRecord.status].description}
            </p>
          </div>

          <div className="card px-3.5 py-3.5">
            <div className="flex items-center justify-between">
              <p className="panel-label">
                <Paperclip className="size-3.5" strokeWidth={2} />
                附件庫
              </p>
              <span className="font-mono text-[10.5px] text-ink-muted">
                {attachments.length}
              </span>
            </div>
            {attachments.length === 0 ? (
              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                尚未上載附件。新增跟進紀錄時可拖曳 PDF 或現場相片。
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {attachments.map((attachment) => (
                  <li key={`${attachment.name}-${attachment.eventDate}`}>
                    <a
                      href={attachmentDataUrl(attachment)}
                      download={attachment.name}
                      className="flex items-center gap-2 rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] text-ink-soft transition hover:border-brand/50 hover:text-brand-dark"
                      title={`${attachment.name}（${formatBytes(attachment.sizeBytes)}）`}
                    >
                      {isImageAttachment(attachment) ? (
                        <ImageIcon className="size-3.5 shrink-0 text-amber-600" strokeWidth={2} />
                      ) : (
                        <FileText className="size-3.5 shrink-0 text-rose-600" strokeWidth={2} />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {attachment.name}
                      </span>
                      <span className="shrink-0 font-mono text-[9.5px] text-ink-muted">
                        {formatYmdShort(attachment.eventDate).slice(2)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
              「匯出全部附件」會把以上檔案連同時間軸對照清單打包成 ZIP。
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="card px-3.5 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
            <div>
              <p className="panel-label">
                <GitCommitVertical className="size-4" strokeWidth={2} />
                跟進時間軸
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                完整書面往來與巡查紀錄；按下「展開全文」可查看陳情書或政府電郵原文。
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {eventCounts.map((entry) => (
                <span key={entry.type} className="inline-flex items-center gap-1">
                  <EventTypeBadge type={entry.type} />
                  <span className="font-mono text-[10px] text-ink-muted">
                    ×{entry.count}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3.5">
            <Timeline
              events={events}
              caseMeta={{
                title: caseRecord.title,
                reference: caseReference(caseRecord),
                department: caseRecord.department,
                location: caseRecord.location,
                actionRequiredBy: caseRecord.actionRequiredBy,
                status: caseRecord.status,
              }}
            />
          </div>

          <p className="mt-3 border-t border-line pt-3 text-[10.5px] leading-relaxed text-ink-muted">
            所有紀錄由人手輸入。若政府回覆附有 PDF 或相片，請上載到對應事件，確保日後可完整重建整個陳情歷程。
          </p>
        </div>
      </div>
    </div>
  );
}
