import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Inbox,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { PendingCaseCard } from "@/components/pending-case-card";
import { EmptyState } from "@/components/ui";
import { daysBetween, todayYmd } from "@/lib/format";
import { listCases } from "@/lib/queries";
import { ensureSeeded } from "@/lib/seed";
import type { CaseSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

function byDeadline(a: CaseSummary, b: CaseSummary): number {
  if (!a.expectedReplyDate && !b.expectedReplyDate) return 0;
  if (!a.expectedReplyDate) return 1;
  if (!b.expectedReplyDate) return -1;
  return a.expectedReplyDate.localeCompare(b.expectedReplyDate);
}

export default async function PendingCasesPage() {
  await ensureSeeded();

  const allCases = await listCases({});
  const today = todayYmd();

  const govCases = allCases
    .filter((caseRecord) => caseRecord.actionRequiredBy === "gov")
    .sort((a, b) => {
      const aOverdue = a.expectedReplyDate !== null && a.expectedReplyDate < today;
      const bOverdue = b.expectedReplyDate !== null && b.expectedReplyDate < today;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      return byDeadline(a, b);
    });

  const userCases = allCases
    .filter((caseRecord) => caseRecord.actionRequiredBy === "user")
    .sort((a, b) => byDeadline(a, b) || b.updatedAt.localeCompare(a.updatedAt));

  const overdueCases = govCases.filter(
    (caseRecord) =>
      caseRecord.expectedReplyDate !== null && caseRecord.expectedReplyDate < today,
  );

  const longestWait =
    govCases.length > 0
      ? Math.max(
          ...govCases.map((caseRecord) =>
            daysBetween(caseRecord.submissionDate, today),
          ),
        )
      : 0;

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Action Required · 待辦專頁</p>
          <h1 className="mt-2 font-serif text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[38px]">
            發球權，現在在誰手上？
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">
            這裡只列出仍然「未完」的案件：一方是等待政府書面回覆的個案（按 SLA
            期限標示逾期風險），另一方是政府已回覆、需要我們追問或確認的個案。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="btn-secondary btn-sm">
            所有案件
            <ArrowUpRight className="size-3.5" strokeWidth={2.2} />
          </Link>
          <Link href="/cases/new" className="btn-primary btn-sm">
            新增案件
            <ArrowRight className="size-3.5" strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/60 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-900">
            <Clock3 className="size-3.5" strokeWidth={2} />
            等待政府
          </p>
          <p className="mt-2 font-serif text-[28px] font-semibold leading-none text-teal-950">
            {govCases.length}
          </p>
          <p className="mt-1.5 text-[11px] text-teal-900/70">部門尚未作實質回覆</p>
        </div>
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/60 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-900">
            <AlertTriangle className="size-3.5" strokeWidth={2} />
            已逾期
          </p>
          <p className="mt-2 font-serif text-[28px] font-semibold leading-none text-rose-950">
            {overdueCases.length}
          </p>
          <p className="mt-1.5 text-[11px] text-rose-900/70">超出預計回覆期限</p>
        </div>
        <div className="rounded-2xl border border-orange-200/80 bg-orange-50/60 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-900">
            <UserRoundCheck className="size-3.5" strokeWidth={2} />
            需要我跟進
          </p>
          <p className="mt-2 font-serif text-[28px] font-semibold leading-none text-orange-950">
            {userCases.length}
          </p>
          <p className="mt-1.5 text-[11px] text-orange-900/70">等待我方追問或確認</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            <ShieldCheck className="size-3.5" strokeWidth={2} />
            最長等待
          </p>
          <p className="mt-2 font-serif text-[28px] font-semibold leading-none text-ink">
            {longestWait}
            <span className="ml-1 text-[13px] font-normal text-ink-muted">日</span>
          </p>
          <p className="mt-1.5 text-[11px] text-ink-muted">由立案日起計算</p>
        </div>
      </section>

      {/* Waiting for government */}
      <section id="waiting-gov" className="scroll-mt-28 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2.5">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold tracking-tight text-ink">
              <span className="flex size-7 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                <Clock3 className="size-4" strokeWidth={2.1} />
              </span>
              等待政府回覆
              <span className="rounded-full bg-paper-deep px-2 py-0.5 font-sans text-[11px] font-medium text-ink-soft">
                {govCases.length}
              </span>
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
              篩選 <code className="rounded bg-paper-deep px-1 font-mono text-[11px]">action_required_by = gov</code>
              ，按預計回覆日排序，逾期個案會優先顯示並以紅色標示。
            </p>
          </div>
          <span className="text-[11px] text-ink-muted">共 {overdueCases.length} 個逾期</span>
        </div>

        {govCases.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" strokeWidth={1.8} />}
            title="沒有等待政府回覆的案件"
            description="所有去信都已收到回覆，或案件已完成結案。新增一則「我方去信」紀錄並將發球權設為政府，即可在此追蹤。"
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {govCases.map((caseRecord) => (
              <PendingCaseCard
                key={caseRecord.id}
                caseRecord={caseRecord}
                emphasis="gov"
              />
            ))}
          </div>
        )}
      </section>

      {/* Needs my follow-up */}
      <section id="needs-user" className="scroll-mt-28 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2.5">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold tracking-tight text-ink">
              <span className="flex size-7 items-center justify-center rounded-full bg-orange-100 text-orange-800">
                <UserRoundCheck className="size-4" strokeWidth={2.1} />
              </span>
              需要我跟進
              <span className="rounded-full bg-paper-deep px-2 py-0.5 font-sans text-[11px] font-medium text-ink-soft">
                {userCases.length}
              </span>
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
              篩選 <code className="rounded bg-paper-deep px-1 font-mono text-[11px]">action_required_by = user</code>
              ：政府已初步回覆，等待我們澄清、追問、上訴或確認結案。
            </p>
          </div>
          <span className="text-[11px] text-ink-muted">發球權在我方</span>
        </div>

        {userCases.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="size-5" strokeWidth={1.8} />}
            title="我方暫無待辦"
            description="目前沒有需要跟進的回覆。收到政府回信後，可在案件詳情頁把發球權切換為「需要我跟進」。"
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {userCases.map((caseRecord) => (
              <PendingCaseCard
                key={caseRecord.id}
                caseRecord={caseRecord}
                emphasis="user"
              />
            ))}
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="panel-label">操作提示</p>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-ink-soft">
            新增時間軸紀錄時，可以同時切換「發球權」與案件狀態，毋須另開頁面。所有附件（政府回函
            PDF、現場照片）會跟隨事件一併歸檔，並可在案件詳情頁一鍵打包成 ZIP。
          </p>
        </div>
        <Link href="/" className="btn-secondary btn-sm shrink-0">
          回到所有案件
          <ArrowRight className="size-3.5" strokeWidth={2.2} />
        </Link>
      </section>
    </div>
  );
}
