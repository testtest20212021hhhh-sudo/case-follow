import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "請使用 YYYY-MM-DD 格式");

export const caseStatusSchema = z.enum([
  "submitted",
  "processing",
  "replied_pending_user",
  "appealing",
  "closed",
]);

export const actionRequiredBySchema = z.enum(["gov", "user", "none"]);

export const eventTypeSchema = z.enum([
  "email_in",
  "email_out",
  "site_visit",
  "internal_note",
]);

export const createCaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "案件主旨至少 2 個字")
    .max(255, "案件主旨不可超過 255 字"),
  department: z.string().trim().min(1, "請選擇負責部門").max(50),
  location: optionalText(255),
  govRefNumber: optionalText(50),
  status: caseStatusSchema.default("submitted"),
  actionRequiredBy: actionRequiredBySchema.default("gov"),
  submissionDate: ymd,
  expectedReplyDate: z
    .preprocess(
      (value) => (value === "" ? null : value),
      z.union([ymd, z.null()]).optional(),
    )
    .optional(),
});

export const updateCaseSchema = createCaseSchema.partial().extend({
  status: caseStatusSchema.optional(),
  actionRequiredBy: actionRequiredBySchema.optional(),
});

/** Base64 附件：每個檔案最大 1.5MB（原始大小），整則事件合計約 2.4MB */
export const storedAttachmentSchema = z
  .object({
    name: z.string().trim().min(1, "附件缺少檔名").max(255, "檔名過長"),
    mimeType: z.string().trim().min(1).max(120),
    sizeBytes: z
      .number()
      .int()
      .min(0)
      .max(1_600_000, "每個檔案不可超過 1.5MB"),
    data: z
      .string()
      .min(8, "附件內容無效")
      .max(2_200_000, "附件內容過大（Base64 後不可超過 2.2MB）")
      .regex(/^[A-Za-z0-9+/=\r\n]+$/, "附件必須為有效的 Base64 字串"),
  })
  .strict();

export const MAX_ATTACHMENTS = 8;

export const createEventSchema = z.object({
  eventDate: z
    .string()
    .min(1, "請填寫事件時間")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "時間格式不正確"),
  eventType: eventTypeSchema,
  description: z
    .string()
    .trim()
    .min(1, "請填寫內容摘要")
    .max(2000, "摘要不可超過 2000 字"),
  fullContent: optionalText(200_000),
  attachments: z
    .array(storedAttachmentSchema)
    .max(MAX_ATTACHMENTS, `每個事件最多 ${MAX_ATTACHMENTS} 個附件`)
    .default([]),
  actionRequiredBy: actionRequiredBySchema.optional(),
  status: caseStatusSchema.optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type StoredAttachmentInput = z.infer<typeof storedAttachmentSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "輸入資料格式不正確";
}
