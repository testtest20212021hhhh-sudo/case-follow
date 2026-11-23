"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { Modal } from "@/components/modal";
import { caseApi } from "@/lib/api-client";
import { CaseFields } from "@/components/case-fields";
import {
  caseFormSchema,
  caseToFormValues,
  toCaseApiPayload,
  type CaseFormValues,
} from "@/lib/case-form";
import type { CaseRecord } from "@/lib/types";

export function EditCaseModal({
  open,
  onClose,
  caseRecord,
}: {
  open: boolean;
  onClose: () => void;
  caseRecord: CaseRecord;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: caseToFormValues(caseRecord),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(caseToFormValues(caseRecord));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseRecord]);

  async function onSubmit(values: CaseFormValues) {
    setSaving(true);
    setError(null);
    try {
      await caseApi.updateCase(caseRecord.id, toCaseApiPayload(values));
      onClose();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "更新案件失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="編輯案件資料"
      subtitle="修正部門、政府編號、SLA 期限或發球權狀態。"
      footer={
        <div className="flex items-center justify-between gap-2">
          {error ? (
            <p className="text-[11px] text-rose-700">{error}</p>
          ) : (
            <p className="text-[10.5px] text-ink-muted">所有欄位可隨時更新。</p>
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-quiet btn-sm">
              取消
            </button>
            <button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={saving}
              className="btn-primary btn-sm"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} />
              ) : (
                <Save className="size-3.5" strokeWidth={2.2} />
              )}
              儲存變更
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CaseFields form={form} />
      </form>
    </Modal>
  );
}
