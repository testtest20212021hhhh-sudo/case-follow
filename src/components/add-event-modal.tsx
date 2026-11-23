"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Camera,
  Check,
  FileText,
  ImageIcon,
  Inbox,
  Loader2,
  Send,
  StickyNote,
  Upload,
  X,
} from "lucide-react";
import { Modal } from "@/components/modal";
import { ExportPdfCheckbox } from "@/components/export-pdf-checkbox";
import { MAX_FILE_BYTES, caseApi, fileToAttachment } from "@/lib/api-client";
import { MAX_ATTACHMENTS } from "@/lib/validation";
import type { StoredAttachment } from "@/lib/types";
import { exportEventInputPdf } from "@/lib/pdf/export-record";
import { formatBytes, isImageAttachment, toDateTimeLocalValue } from "@/lib/format";
import {
  ACTION_META,
  CASE_STATUSES,
  EVENT_META,
  EVENT_TYPES,
  STATUS_META,
  type ActionRequiredBy,
  type CaseStatus,
  type EventType,
} from "@/lib/types";

const eventFormSchema = z.object({
  eventDate: z.string().min(1, "請填寫事件時間"),
  eventType: z.enum(["email_in", "email_out", "site_visit", "internal_note"]),
  description: z
    .string()
    .trim()
    .min(1, "請填寫內容摘要")
    .max(2000, "摘要不可超過 2000 字"),
  fullContent: z.string().max(200_000, "全文過長").optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const EVENT_ICON: Record<EventType, typeof Send> = {
  email_out: Send,
  email_in: Inbox,
  site_visit: Camera,
  internal_note: StickyNote,
};

export function AddEventModal({
  open,
  onClose,
  caseId,
  caseTitle,
  caseReference,
  department,
  location,
  currentAction,
  currentStatus,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
  caseReference: string;
  department: string;
  location: string | null;
  currentAction: ActionRequiredBy;
  currentStatus: CaseStatus;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [attachments, setAttachments] = useState<StoredAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nextAction, setNextAction] = useState<ActionRequiredBy | "keep">("keep");
  const [nextStatus, setNextStatus] = useState<CaseStatus | "keep">("keep");
  const [exportPdf, setExportPdf] = useState(false);
  const [exporting, setExporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      eventDate: toDateTimeLocalValue(),
      eventType: "email_in",
      description: "",
      fullContent: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      eventDate: toDateTimeLocalValue(),
      eventType: "email_in",
      description: "",
      fullContent: "",
    });
    setStep(1);
    setAttachments([]);
    setError(null);
    setNextAction("keep");
    setNextStatus("keep");
    setExportPdf(false);
    setExporting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedType = form.watch("eventType") as EventType;

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    if (attachments.length + list.length > MAX_ATTACHMENTS) {
      setError(`每個事件最多 ${MAX_ATTACHMENTS} 個附件。`);
      return;
    }
    const oversized = list.find((file) => file.size > MAX_FILE_BYTES);
    if (oversized) {
      setError(`${oversized.name} 超過 1.5MB 上限（Base64 直接存入 Neon，請先壓縮檔案）。`);
      return;
    }
    const unsupported = list.find(
      (file) =>
        !(file.type || "").match(/^(application\/pdf|image\/)/) &&
        !file.name.match(/\.(pdf|png|jpe?g|gif|webp)$/i),
    );
    if (unsupported) {
      setError(`不支援的檔案格式：${unsupported.name}（僅接受 PDF 或圖片）`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      // 客戶端直接把檔案轉成 Base64，隨表單一併寫入 Neon
      const converted = await Promise.all(list.map((file) => fileToAttachment(file)));
      setAttachments((current) => [...current, ...converted]);
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "檔案轉檔失敗");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function goNext() {
    const values = form.getValues();
    if (!values.description.trim()) {
      form.setError("description", { message: "請填寫內容摘要" });
      return;
    }
    const suggested: ActionRequiredBy | "keep" =
      values.eventType === "email_in"
        ? "user"
        : values.eventType === "email_out"
          ? "gov"
          : "keep";
    setNextAction(suggested);
    setNextStatus("keep");
    setError(null);
    setStep(2);
  }

  async function confirm() {
    const values = form.getValues();
    setSubmitting(true);
    setError(null);
    try {
      await caseApi.createEvent(caseId, {
        eventDate: values.eventDate,
        eventType: values.eventType,
        description: values.description,
        fullContent: values.fullContent?.trim() || undefined,
        attachments,
        ...(nextAction !== "keep" ? { actionRequiredBy: nextAction } : {}),
        ...(nextStatus !== "keep" ? { status: nextStatus } : {}),
      });

      if (exportPdf) {
        setExporting(true);
        try {
          await exportEventInputPdf({
            caseTitle,
            caseReference,
            department,
            location,
            eventDate: values.eventDate,
            eventType: values.eventType,
            description: values.description,
            fullContent: values.fullContent?.trim() || undefined,
            attachmentNames: attachments.map((attachment) => attachment.name),
            nextAction: nextAction === "keep" ? undefined : nextAction,
            nextStatus: nextStatus === "keep" ? undefined : nextStatus,
            currentAction,
            currentStatus,
          });
        } catch (pdfError) {
          console.error("[pdf export]", pdfError);
          setExporting(false);
          setSubmitting(false);
          setError("紀錄已儲存，但 PDF 匯出失敗，請關閉視窗後再試。");
          router.refresh();
          return;
        }
        setExporting(false);
      }

      onClose();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "新增紀錄失敗");
    } finally {
      setSubmitting(false);
    }
  }

  const footer =
    step === 1 ? (
      <div className="flex items-center justify-between gap-2">
        <p className="hidden text-[10.5px] text-ink-muted sm:block">
          附件會存放於案件儲存空間；下一步可選擇同時把本次輸入匯出為 PDF。
        </p>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onClose} className="btn-quiet btn-sm">
            取消
          </button>
          <button type="button" onClick={goNext} className="btn-primary btn-sm">
            下一步：更新發球權
            <Check className="size-3.5" strokeWidth={2.4} />
          </button>
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ExportPdfCheckbox
          id="export-event-pdf"
          checked={exportPdf}
          onChange={setExportPdf}
          busy={exporting}
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="btn-quiet btn-sm"
            disabled={submitting}
          >
            上一步
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={submitting}
            className="btn-primary btn-sm"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} />
            ) : (
              <Check className="size-3.5" strokeWidth={2.4} />
            )}
            {exporting ? "正在產生 PDF…" : "確認新增紀錄"}
          </button>
        </div>
      </div>
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 1 ? "新增跟進紀錄" : "更新案件待辦狀態？"}
      subtitle={
        step === 1
          ? caseTitle
          : "記錄已準備好，最後一步：決定發球權要交給誰。"
      }
      footer={footer}
    >
      {error ? (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            goNext();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="eventDate" className="field-label">
                發生時間 <span className="text-rose-600">*</span>
              </label>
              <input
                id="eventDate"
                type="datetime-local"
                className="field-input"
                {...form.register("eventDate")}
              />
              {form.formState.errors.eventDate ? (
                <p className="field-error">
                  {form.formState.errors.eventDate.message}
                </p>
              ) : (
                <p className="field-hint">以香港時間 (UTC+8) 記錄。</p>
              )}
            </div>
            <div>
              <span className="field-label">事件類型</span>
              <div className="grid grid-cols-2 gap-1.5">
                {EVENT_TYPES.map((type) => {
                  const Icon = EVENT_ICON[type];
                  const active = selectedType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        form.setValue("eventType", type, { shouldValidate: true })
                      }
                      className={`flex items-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-medium transition ${
                        active
                          ? "border-brand bg-brand text-white"
                          : "border-line-strong bg-white text-ink-soft hover:border-brand/40"
                      }`}
                    >
                      <Icon className="size-3.5 shrink-0" strokeWidth={2} />
                      <span className="truncate">{EVENT_META[type].short}</span>
                    </button>
                  );
                })}
              </div>
              <p className="field-hint">{EVENT_META[selectedType].label}</p>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="field-label">
              內容摘要 <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="description"
              rows={2}
              className="field-input resize-y"
              placeholder="例如：收到路政署回覆，個案編號 HY/TPO/2026/0412，指已轉交九龍區維修組。"
              {...form.register("description")}
            />
            {form.formState.errors.description ? (
              <p className="field-error">
                {form.formState.errors.description.message}
              </p>
            ) : (
              <p className="field-hint">
                時間軸上顯示的簡短描述，建議一句交代事件重點。
              </p>
            )}
          </div>

          <div>
            <label htmlFor="fullContent" className="field-label">
              詳細全文
              <span className="rounded-full bg-paper-deep px-1.5 py-0.5 text-[9.5px] font-normal text-ink-muted">
                可展開查閱
              </span>
            </label>
            <textarea
              id="fullContent"
              rows={7}
              className="field-input resize-y font-sans text-[12.5px] leading-relaxed"
              placeholder="貼上陳情書全文、政府電郵完整內文或巡查紀錄。此欄內容會在時間軸以「展開全文」按鈕隱藏。"
              {...form.register("fullContent")}
            />
            <p className="field-hint">
              純文字保存，換行會原樣保留。毋須上載 Word 檔。
            </p>
          </div>

          <div>
            <span className="field-label">
              書面／相片證據
              <span className="rounded-full bg-paper-deep px-1.5 py-0.5 text-[9.5px] font-normal text-ink-muted">
                PDF · 圖片
              </span>
            </span>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (event.dataTransfer.files?.length) {
                  void handleFiles(event.dataTransfer.files);
                }
              }}
              className={`rounded-xl border-2 border-dashed px-3 py-4 text-center transition ${
                dragging
                  ? "border-brand bg-brand-soft/60"
                  : "border-line-strong bg-paper/50"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) {
                    void handleFiles(event.target.files);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 text-[12px] font-medium text-brand-dark hover:underline disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2.2} />
                ) : (
                  <Upload className="size-4" strokeWidth={2.2} />
                )}
                {uploading ? "轉檔中…" : "拖曳檔案到此，或點擊選擇"}
              </button>
              <p className="mt-1 text-[10.5px] text-ink-muted">
                政府回函 PDF、現場相片；每個檔案上限 1.5MB，最多 {MAX_ATTACHMENTS} 個。
                檔案會在瀏覽器轉成 Base64 後一併存入 Neon 資料庫。
              </p>
            </div>

            {attachments.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {attachments.map((attachment) => (
                  <li
                    key={`${attachment.name}-${attachment.sizeBytes}`}
                    className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2"
                  >
                    {isImageAttachment(attachment) ? (
                      <ImageIcon className="size-4 shrink-0 text-amber-600" strokeWidth={2} />
                    ) : (
                      <FileText className="size-4 shrink-0 text-rose-600" strokeWidth={2} />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">
                      {attachment.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-ink-muted">
                      {formatBytes(attachment.sizeBytes)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((current) =>
                          current.filter(
                            (item) =>
                              item.name !== attachment.name ||
                              item.sizeBytes !== attachment.sizeBytes,
                          ),
                        )
                      }
                      className="rounded-full p-1 text-ink-muted hover:bg-paper-deep hover:text-rose-700"
                      aria-label={`移除 ${attachment.name}`}
                    >
                      <X className="size-3.5" strokeWidth={2.2} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-paper/60 px-3.5 py-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
              <span className="chip bg-white text-ink-soft ring-line">
                {EVENT_META[selectedType].label}
              </span>
              <span className="font-mono">
                {form.getValues("eventDate").replace("T", " ")}
              </span>
              <span>· {attachments.length} 個附件</span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink">
              {form.getValues("description")}
            </p>
          </div>

          <div>
            <p className="field-label">發球權交給…</p>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {(["gov", "user", "none"] as ActionRequiredBy[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNextAction(key)}
                  className={`rounded-xl border px-2.5 py-2.5 text-left transition ${
                    nextAction === key
                      ? "border-brand bg-brand text-white"
                      : "border-line-strong bg-white text-ink hover:border-brand/40"
                  }`}
                >
                  <span className="block text-[12px] font-semibold">
                    {ACTION_META[key].label}
                  </span>
                  <span
                    className={`mt-0.5 block text-[10px] leading-relaxed ${
                      nextAction === key ? "text-white/75" : "text-ink-muted"
                    }`}
                  >
                    {ACTION_META[key].short}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setNextAction("keep")}
              className={`mt-1.5 w-full rounded-xl border px-2.5 py-2 text-[11.5px] transition ${
                nextAction === "keep"
                  ? "border-brand/50 bg-brand-soft text-brand-dark"
                  : "border-line-strong bg-white text-ink-soft hover:border-brand/40"
              }`}
            >
              不變更（維持「{ACTION_META[currentAction].label}」）
            </button>
            {nextAction !== "keep" ? (
              <p className="field-hint">
                送出後，此案件的發球權會更新為「{ACTION_META[nextAction].label}」。
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="nextStatus" className="field-label">
              同步案件狀態（可選）
            </label>
            <select
              id="nextStatus"
              value={nextStatus}
              onChange={(event) =>
                setNextStatus(event.target.value as CaseStatus | "keep")
              }
              className="field-input cursor-pointer"
            >
              <option value="keep">
                保持不變（目前：{STATUS_META[currentStatus].label}）
              </option>
              {CASE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status].label} — {STATUS_META[status].description}
                </option>
              ))}
            </select>
          </div>

          {exportPdf ? (
            <p className="rounded-lg border border-brand/30 bg-brand-soft/60 px-3 py-2 text-[10.5px] leading-relaxed text-brand-dark">
              送出後會自動下載 A4 PDF：「{caseTitle}_日期_紀錄.pdf」，內含時間、類型、摘要、詳細全文、附件清單及發球權變更。
            </p>
          ) : null}
          <p className="rounded-lg border border-line bg-paper/60 px-3 py-2 text-[10.5px] leading-relaxed text-ink-muted">
            提示：收到政府回信後，通常將發球權轉為「需要我跟進」；若我方正等待部門書面回覆，則設為「等待政府回覆」；雙方均無需行動時選「已結案」。
          </p>
        </div>
      )}
    </Modal>
  );
}
