import { z } from "zod";
import type { CaseRecord } from "@/lib/types";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const caseFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "案件主旨至少 2 個字")
    .max(255, "案件主旨不可超過 255 字"),
  department: z.string().trim().min(1, "請選擇或輸入負責部門").max(50),
  location: z.string().trim().max(255, "地點不可超過 255 字").optional(),
  govRefNumber: z.string().trim().max(50, "政府編號不可超過 50 字").optional(),
  status: z.enum([
    "submitted",
    "processing",
    "replied_pending_user",
    "appealing",
    "closed",
  ]),
  actionRequiredBy: z.enum(["gov", "user", "none"]),
  submissionDate: z
    .string()
    .min(1, "請填寫立案日期")
    .regex(YMD, "請使用 YYYY-MM-DD 格式"),
  expectedReplyDate: z
    .string()
    .optional()
    .refine(
      (value) => !value || YMD.test(value),
      "請使用 YYYY-MM-DD 格式",
    ),
});

export type CaseFormValues = z.infer<typeof caseFormSchema>;

export function addDaysYmd(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function caseToFormValues(caseRecord: CaseRecord): CaseFormValues {
  return {
    title: caseRecord.title,
    department: caseRecord.department,
    location: caseRecord.location ?? "",
    govRefNumber: caseRecord.govRefNumber ?? "",
    status: caseRecord.status,
    actionRequiredBy: caseRecord.actionRequiredBy,
    submissionDate: caseRecord.submissionDate,
    expectedReplyDate: caseRecord.expectedReplyDate ?? "",
  };
}

export function toCaseApiPayload(values: CaseFormValues) {
  return {
    title: values.title,
    department: values.department,
    location: values.location?.trim() ?? "",
    govRefNumber: values.govRefNumber?.trim() ?? "",
    status: values.status,
    actionRequiredBy: values.actionRequiredBy,
    submissionDate: values.submissionDate,
    expectedReplyDate: values.expectedReplyDate?.trim() || null,
  };
}
