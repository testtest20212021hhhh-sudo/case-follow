"use client";

import type { UseFormReturn } from "react-hook-form";
import { Info } from "lucide-react";
import type { CaseFormValues } from "@/lib/case-form";
import {
  ACTION_META,
  CASE_STATUSES,
  DEPARTMENTS,
  STATUS_META,
  type ActionRequiredBy,
} from "@/lib/types";

export function CaseFields({ form }: { form: UseFormReturn<CaseFormValues> }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const action = watch("actionRequiredBy");

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="title" className="field-label">
          案件主旨 <span className="text-rose-600">*</span>
        </label>
        <input
          id="title"
          type="text"
          placeholder="例如：尚德邨唐明街行人路上蓋長期積水及地磚破損"
          className="field-input"
          {...register("title")}
        />
        {errors.title ? <p className="field-error">{errors.title.message}</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="department" className="field-label">
            負責部門 <span className="text-rose-600">*</span>
          </label>
          <input
            id="department"
            list="department-options"
            type="text"
            placeholder="1823 / FEHD / HyD…"
            className="field-input uppercase-placeholder"
            autoComplete="off"
            {...register("department")}
          />
          <datalist id="department-options">
            {DEPARTMENTS.map((department) => (
              <option key={department.code} value={department.code}>
                {department.name}
              </option>
            ))}
          </datalist>
          {errors.department ? (
            <p className="field-error">{errors.department.message}</p>
          ) : (
            <p className="field-hint">可輸入部門代碼或全名，例如 HyD、路政署。</p>
          )}
        </div>

        <div>
          <label htmlFor="govRefNumber" className="field-label">
            政府回覆編號
          </label>
          <input
            id="govRefNumber"
            type="text"
            placeholder="例如 HY/TPO/2026/0412"
            className="field-input font-mono text-[13px]"
            {...register("govRefNumber")}
          />
          {errors.govRefNumber ? (
            <p className="field-error">{errors.govRefNumber.message}</p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="location" className="field-label">
          具體地點
        </label>
        <input
          id="location"
          type="text"
          placeholder="例如：將軍澳尚德邨唐明街"
          className="field-input"
          {...register("location")}
        />
        {errors.location ? <p className="field-error">{errors.location.message}</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="submissionDate" className="field-label">
            立案日期 <span className="text-rose-600">*</span>
          </label>
          <input
            id="submissionDate"
            type="date"
            className="field-input"
            {...register("submissionDate")}
          />
          {errors.submissionDate ? (
            <p className="field-error">{errors.submissionDate.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="expectedReplyDate" className="field-label">
            預計回覆期限（SLA）
          </label>
          <input
            id="expectedReplyDate"
            type="date"
            className="field-input"
            {...register("expectedReplyDate")}
          />
          {errors.expectedReplyDate ? (
            <p className="field-error">{errors.expectedReplyDate.message}</p>
          ) : (
            <p className="field-hint">留空則不計算 SLA 逾期警示。</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className="field-label">
            案件狀態
          </label>
          <select id="status" className="field-input cursor-pointer" {...register("status")}>
            {CASE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label} — {STATUS_META[status].description}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="field-label">目前發球權</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(["gov", "user", "none"] as ActionRequiredBy[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setValue("actionRequiredBy", key, { shouldValidate: true })
                }
                className={`rounded-xl border px-2 py-2.5 text-[11.5px] font-medium transition ${
                  action === key
                    ? "border-brand bg-brand text-white"
                    : "border-line-strong bg-white text-ink-soft hover:border-brand/40"
                }`}
              >
                {ACTION_META[key].label}
              </button>
            ))}
          </div>
          <p className="field-hint flex items-start gap-1">
            <Info className="mt-0.5 size-3 shrink-0" strokeWidth={2} />
            {ACTION_META[action].hint}
          </p>
        </div>
      </div>
    </div>
  );
}
