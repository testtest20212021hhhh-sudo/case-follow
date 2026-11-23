import Link from "next/link";
import {
  Archive,
  ChevronRight,
  FilePlus2,
  GitCommitVertical,
  Send,
  ShieldCheck,
} from "lucide-react";
import { NewCaseForm } from "@/components/new-case-form";

export const metadata = {
  title: "新增案件 · 陳情檔案",
};

export default function NewCasePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
        <Link href="/" className="transition hover:text-ink">
          所有案件
        </Link>
        <ChevronRight className="size-3" strokeWidth={2} />
        <span className="text-ink">新增案件</span>
      </nav>

      <header>
        <p className="eyebrow">New case · 立案</p>
        <h1 className="mt-2 font-serif text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[34px]">
          建立新的陳情／倡議案件
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
          先為個案建立檔案，再逐則加入去信、政府回覆、實地巡查與內部筆記。立案日期與 SLA
          期限會用來計算逾期警示。
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_264px] lg:items-start">
        <NewCaseForm />

        <aside className="space-y-3">
          <div className="card px-4 py-4">
            <p className="panel-label">
              <FilePlus2 className="size-4" strokeWidth={2} />
              建議記錄流程
            </p>
            <ol className="mt-3 space-y-3">
              {[
                {
                  icon: Send,
                  title: "1. 去信／陳情",
                  body: "貼上陳情書全文，上載簽署版本 PDF，發球權設為「政府」。",
                },
                {
                  icon: GitCommitVertical,
                  title: "2. 政府回覆",
                  body: "收到電郵或公函後新增紀錄，附上 PDF，發球權轉「我方」。",
                },
                {
                  icon: Archive,
                  title: "3. 巡查與追問",
                  body: "實地拍照量度，將照片歸檔到時間軸，累積證據。",
                },
                {
                  icon: ShieldCheck,
                  title: "4. 結案",
                  body: "訴求達成或轉介申訴專員後，把發球權設為「結案」歸檔。",
                },
              ].map((step) => (
                <li key={step.title} className="flex gap-2.5">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
                    <step.icon className="size-3.5" strokeWidth={2.1} />
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-ink">{step.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-900">
              小提示
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-amber-900/80">
              部門欄可輸入部門代碼（HyD、FEHD、1823…）或全名。SLA
              建議設為去信後 21 至 30 個工作天，較貼近部門實際回覆時間。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
