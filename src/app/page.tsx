import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Clock3,
  FolderOpen,
  Paperclip,
  Plus,
  UserRoundCheck,
} from "lucide-react";
import { CaseRow } from "@/components/case-row";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState, StatCard } from "@/components/ui";
import { getDashboardStats, listCases } from "@/lib/queries";
import { ensureSeeded } from "@/lib/seed";
import { ACTION_META, CASE_STATUSES, STATUS_META } from "@/lib/types";
import type { ActionRequiredBy, CaseStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  department?: string;
  status?: string;
  action?: string;
}

const ACTIONS: ActionRequiredBy[] = ["gov", "user", "none"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await ensureSeeded();
  const params = await searchParams;

  const status = CASE_STATUSES.includes(params.status as CaseStatus)
    ? (params.status as CaseStatus)
    : undefined;
  const action = ACTIONS.includes(params.action as ActionRequiredBy)
    ? (params.action as ActionRequiredBy)
    : undefined;

  const [stats, caseList] = await Promise.all([
    getDashboardStats(),
    listCases({
      q: params.q?.trim() || undefined,
      department: params.department || undefined,
      status,
      action,
    }),
  ]);

  return (
    <div className="space-y-7">
      {/* Hero */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_312px] lg:items-end">
        <div>
          <p className="eyebrow">Civic Casework · 個案總覽</p>
          <h1 className="mt-2 font-serif text-[32px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[40px]">
            每一封去信，都留下軌跡。
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">
            集中管理向香港政府部門提交的投訴與倡議：時間軸、書面往來全文、現場照片與政府回函 PDF
            全部歸檔，並清楚標示「發球權」目前落在政府還是我們身上。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/cases/pending" className="btn-primary">
              <ClipboardList className="size-4" strokeWidth={2.1} />
              進入待辦專頁
            </Link>
            <Link href="/cases/new" className="btn-secondary">
              <Plus className="size-4" strokeWidth={2.1} />
              建立新案件
            </Link>
            <span className="ml-1 inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted">
              <Paperclip className="size-3.5" strokeWidth={2} />
              已歸檔 {stats.attachments} 個附件
            </span>
          </div>
        </div>

        <div className="card px-4 py-4">
          <p className="panel-label">
            <span className="size-1.5 rounded-full bg-brand" />
            發球權邏輯
          </p>
          <ul className="mt-3 space-y-2.5">
            {(["gov", "user", "none"] as ActionRequiredBy[]).map((key) => (
              <li key={key} className="flex gap-2.5">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${
                    key === "gov"
                      ? "bg-teal-600"
                      : key === "user"
                        ? "bg-orange-500"
                        : "bg-stone-400"
                  }`}
                />
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">
                    {ACTION_META[key].label}
                  </p>
                  <p className="text-[11px] leading-relaxed text-ink-muted">
                    {ACTION_META[key].hint}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="全部案件"
          value={stats.total}
          hint={`${stats.events} 則時間軸紀錄`}
          icon={<FolderOpen className="size-4" strokeWidth={2} />}
        />
        <StatCard
          label="等待政府"
          value={stats.awaitingGov}
          hint="發球權在部門"
          href="/cases/pending#waiting-gov"
          icon={<Clock3 className="size-4" strokeWidth={2} />}
          tone="default"
        />
        <StatCard
          label="需要我跟進"
          value={stats.awaitingUser}
          hint="追問 / 補交 / 確認"
          href="/cases/pending#needs-user"
          icon={<UserRoundCheck className="size-4" strokeWidth={2} />}
          tone="warning"
        />
        <StatCard
          label="SLA 已逾期"
          value={stats.overdue}
          hint="超出預計回覆日"
          href="/cases/pending"
          icon={<AlertTriangle className="size-4" strokeWidth={2} />}
          tone="danger"
        />
        <StatCard
          label="已結案"
          value={stats.closed}
          hint="完成歸檔"
          icon={<ClipboardList className="size-4" strokeWidth={2} />}
          tone="muted"
        />
      </section>

      {stats.overdue > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-700" strokeWidth={2.2} />
            <p className="text-[12.5px] leading-relaxed text-rose-900">
              <span className="font-semibold">{stats.overdue} 個案件</span>{" "}
              已超出預計回覆期限，政府仍未作實質回覆。建議透過 1823 升級或去信追問。
            </p>
          </div>
          <Link
            href="/cases/pending"
            className="btn btn-sm shrink-0 rounded-full bg-rose-700 px-3 py-1.5 text-white hover:bg-rose-800"
          >
            查看逾期案件
            <ArrowRight className="size-3.5" strokeWidth={2.2} />
          </Link>
        </div>
      ) : null}

      {/* Filters + list */}
      <section className="space-y-3">
        <FilterBar
          basePath="/"
          current={{
            q: params.q,
            department: params.department,
            status: params.status,
            action: params.action,
          }}
          resultCount={caseList.length}
        />

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <div className="panel-label">
              <ClipboardList className="size-4" strokeWidth={2} />
              案件列表
              <span className="font-mono text-[11px] font-normal tracking-normal text-ink-muted">
                {caseList.length} / {stats.total}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href="/"
                className={`chip ${
                  !status && !action
                    ? "bg-brand text-white ring-brand"
                    : "bg-paper text-ink-soft ring-line"
                }`}
              >
                熱門檢視
              </Link>
              <Link
                href="/?status=processing"
                className={`chip ${
                  status === "processing"
                    ? "bg-amber-100 text-amber-900 ring-amber-300"
                    : "bg-paper text-ink-soft ring-line hover:bg-paper-deep"
                }`}
              >
                {STATUS_META.processing.label}
              </Link>
              <Link
                href="/?action=user"
                className={`chip ${
                  action === "user"
                    ? "bg-orange-100 text-orange-900 ring-orange-300"
                    : "bg-paper text-ink-soft ring-line hover:bg-paper-deep"
                }`}
              >
                {ACTION_META.user.label}
              </Link>
              <Link
                href="/?action=gov"
                className={`chip ${
                  action === "gov"
                    ? "bg-teal-100 text-teal-900 ring-teal-300"
                    : "bg-paper text-ink-soft ring-line hover:bg-paper-deep"
                }`}
              >
                {ACTION_META.gov.label}
              </Link>
            </div>
          </div>

          {caseList.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="沒有符合條件的案件"
                description="嘗試清除篩選條件，或建立一個新案件，開始記錄第一封去信與政府回覆。"
                action={
                  <Link href="/cases/new" className="btn-primary btn-sm">
                    <Plus className="size-3.5" strokeWidth={2.2} />
                    建立案件
                  </Link>
                }
              />
            </div>
          ) : (
            <div>
              {caseList.map((caseRecord) => (
                <CaseRow key={caseRecord.id} caseRecord={caseRecord} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
