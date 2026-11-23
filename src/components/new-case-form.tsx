"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { CaseFields } from "@/components/case-fields";
import { ExportPdfCheckbox } from "@/components/export-pdf-checkbox";
import { caseApi } from "@/lib/api-client";
import { exportCaseInputPdf } from "@/lib/pdf/export-record";
import {
  addDaysYmd,
  caseFormSchema,
  toCaseApiPayload,
  type CaseFormValues,
} from "@/lib/case-form";
import { todayYmd } from "@/lib/format";

export function NewCaseForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exportPdf, setExportPdf] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfWarning, setPdfWarning] = useState<string | null>(null);
  const today = todayYmd();

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      title: "",
      department: "",
      location: "",
      govRefNumber: "",
      status: "submitted",
      actionRequiredBy: "gov",
      submissionDate: today,
      expectedReplyDate: addDaysYmd(today, 21),
    },
  });

  async function onSubmit(values: CaseFormValues) {
    setSubmitting(true);
    setError(null);
    setPdfWarning(null);
    try {
      const created = await caseApi.createCase(toCaseApiPayload(values));

      if (exportPdf) {
        setExporting(true);
        try {
          await exportCaseInputPdf({
            title: values.title,
            department: values.department,
            govRefNumber: values.govRefNumber,
            location: values.location,
            status: values.status,
            actionRequiredBy: values.actionRequiredBy,
            submissionDate: values.submissionDate,
            expectedReplyDate: values.expectedReplyDate || undefined,
            caseId: created.id,
          });
        } catch (pdfError) {
          console.error("[pdf export]", pdfError);
          setPdfWarning("案件已建立，但 PDF 匯出失敗。你仍可在案件頁重新輸出。");
          setExporting(false);
          setSubmitting(false);
          window.setTimeout(() => router.push(`/cases/${created.id}`), 2500);
          return;
        }
        setExporting(false);
      }

      router.push(`/cases/${created.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "建立案件失敗");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="card overflow-hidden"
    >
      <div className="border-b border-line px-4 py-3.5 sm:px-5">
        <p className="panel-label">案件基本資料</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
          所有欄位以人手輸入，主旨、部門及立案日期為必填。建立後即可加入第一則時間軸紀錄。
        </p>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <CaseFields form={form} />
      </div>

      <div className="space-y-2.5 border-t border-line bg-paper/50 px-4 py-3 sm:px-5">
        {error ? (
          <p className="text-[11.5px] font-medium text-rose-700">{error}</p>
        ) : pdfWarning ? (
          <p className="text-[11.5px] font-medium text-amber-800">{pdfWarning}</p>
        ) : (
          <p className="text-[10.5px] leading-relaxed text-ink-muted">
            發球權預設為「等待政府回覆」，可稍後在詳情頁一鍵切換。剔選下方選項可同時下載一份
            A4 PDF 本機備份（檔名：主旨_日期_紀錄.pdf）。
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ExportPdfCheckbox
            id="export-case-pdf"
            checked={exportPdf}
            onChange={setExportPdf}
            busy={exporting}
          />
          <button type="submit" disabled={submitting} className="btn-primary btn-sm">
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} />
            ) : (
              <Plus className="size-3.5" strokeWidth={2.4} />
            )}
            {exporting ? "正在產生 PDF…" : "建立案件"}
          </button>
        </div>
      </div>
    </form>
  );
}
