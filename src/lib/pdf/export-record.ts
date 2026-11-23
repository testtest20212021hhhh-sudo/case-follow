"use client";

import { createElement, type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import {
  formatDateTime,
  formatYmd,
  sanitizeFilename,
  todayYmd,
} from "@/lib/format";
import {
  ACTION_META,
  EVENT_META,
  STATUS_META,
  departmentName,
  type ActionRequiredBy,
  type CaseStatus,
  type EventType,
} from "@/lib/types";
import type { PdfRecordData } from "@/lib/pdf/record-document";

/* -------------------------------------------------------------------------- */
/*  Low-level: build + download                                                */
/* -------------------------------------------------------------------------- */

async function renderAndDownload(data: PdfRecordData, fileName: string) {
  const [{ pdf }, { RecordDocument, registerPdfFonts }, { saveAs }] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/pdf/record-document"),
      import("file-saver"),
    ]);

  registerPdfFonts(window.location.origin);
  const element = createElement(RecordDocument, { data }) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(element).toBlob();
  saveAs(blob, fileName);
}

function pdfFileName(title: string, ymd: string): string {
  return `${sanitizeFilename(title, "案件")}_${ymd}_紀錄.pdf`;
}

/* -------------------------------------------------------------------------- */
/*  1. New case form → PDF                                                     */
/* -------------------------------------------------------------------------- */

export interface CasePdfInput {
  title: string;
  department: string;
  govRefNumber?: string;
  location?: string;
  status: CaseStatus;
  actionRequiredBy: ActionRequiredBy;
  submissionDate: string;
  expectedReplyDate?: string;
  /** Returned by the API after creation, if available. */
  caseId?: string;
}

export async function exportCaseInputPdf(input: CasePdfInput): Promise<void> {
  const generatedAt = formatDateTime(new Date().toISOString());
  const reference =
    input.govRefNumber?.trim() ||
    (input.caseId ? `CASE-${input.caseId.slice(0, 8).toUpperCase()}` : "新案件");

  const data: PdfRecordData = {
    kind: "新增案件紀錄 · Case Record",
    title: input.title,
    reference,
    generatedAt,
    fields: [
      { label: "案件主旨", value: input.title },
      {
        label: "負責部門",
        value: `${departmentName(input.department)}（${input.department}）`,
      },
      { label: "政府回覆編號", value: input.govRefNumber?.trim() || "尚未獲編號" },
      { label: "具體地點", value: input.location?.trim() || "未填寫" },
      { label: "立案日期", value: formatYmd(input.submissionDate) },
      {
        label: "預計回覆期限",
        value: input.expectedReplyDate
          ? formatYmd(input.expectedReplyDate)
          : "未設定",
      },
      { label: "案件狀態", value: STATUS_META[input.status].label },
      {
        label: "目前發球權",
        value: `${ACTION_META[input.actionRequiredBy].label} — ${
          ACTION_META[input.actionRequiredBy].hint
        }`,
      },
      ...(input.caseId ? [{ label: "系統編號", value: input.caseId }] : []),
    ],
    sections: [
      {
        heading: "立案摘要",
        note: "依據新增案件表單輸入內容自動產生。",
        body: [
          `本案件於 ${formatYmd(input.submissionDate)} 向 ${departmentName(
            input.department,
          )} 提出，主旨為「${input.title}」。`,
          input.location?.trim() ? `涉及地點：${input.location.trim()}。` : "",
          input.expectedReplyDate
            ? `預計回覆期限為 ${formatYmd(input.expectedReplyDate)}，逾期將於待辦專頁標示 SLA 警告。`
            : "尚未設定預計回覆期限。",
          `目前狀態：${STATUS_META[input.status].label}；發球權：${
            ACTION_META[input.actionRequiredBy].label
          }。`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    attachments: [],
    footerNote:
      "此文件為表單輸入內容之本機備份，並非政府部門發出之正式文件。",
  };

  await renderAndDownload(data, pdfFileName(input.title, input.submissionDate));
}

/* -------------------------------------------------------------------------- */
/*  2. Timeline event form → PDF                                               */
/* -------------------------------------------------------------------------- */

export interface EventPdfInput {
  caseTitle: string;
  caseReference: string;
  department: string;
  location?: string | null;
  eventDate: string; // datetime-local value or ISO
  eventType: EventType;
  description: string;
  fullContent?: string;
  attachmentNames: string[];
  nextAction?: ActionRequiredBy;
  nextStatus?: CaseStatus;
  currentAction: ActionRequiredBy;
  currentStatus: CaseStatus;
}

function eventDateToIso(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return new Date(`${value}:00+08:00`).toISOString();
  }
  return new Date(value).toISOString();
}

export async function exportEventInputPdf(input: EventPdfInput): Promise<void> {
  const iso = eventDateToIso(input.eventDate);
  const ymd = iso.slice(0, 10);
  const generatedAt = formatDateTime(new Date().toISOString());
  const eventMeta = EVENT_META[input.eventType];

  const actionLine = input.nextAction
    ? `${ACTION_META[input.currentAction].label} → ${
        ACTION_META[input.nextAction].label
      }`
    : `${ACTION_META[input.currentAction].label}（維持不變）`;
  const statusLine = input.nextStatus
    ? `${STATUS_META[input.currentStatus].label} → ${
        STATUS_META[input.nextStatus].label
      }`
    : `${STATUS_META[input.currentStatus].label}（維持不變）`;

  const data: PdfRecordData = {
    kind: `跟進紀錄 · ${eventMeta.label}`,
    title: input.caseTitle,
    reference: input.caseReference,
    generatedAt,
    fields: [
      { label: "所屬案件", value: input.caseTitle },
      { label: "政府／案件編號", value: input.caseReference },
      {
        label: "負責部門",
        value: `${departmentName(input.department)}（${input.department}）`,
      },
      { label: "地點", value: input.location?.trim() || "未填寫" },
      { label: "發生時間", value: formatDateTime(iso) },
      { label: "事件類型", value: eventMeta.label },
      { label: "發球權", value: actionLine },
      { label: "案件狀態", value: statusLine },
    ],
    sections: [
      {
        heading: "內容摘要",
        body: input.description,
      },
      {
        heading: "詳細全文",
        note:
          input.eventType === "email_in"
            ? "政府回覆原文（人手輸入）"
            : input.eventType === "email_out"
              ? "陳情／去信全文（人手輸入）"
              : input.eventType === "site_visit"
                ? "實地巡查紀錄"
                : "內部筆記",
        body: input.fullContent ?? "",
      },
    ],
    attachments: input.attachmentNames,
    footerNote:
      "此文件由系統依據表單輸入內容自動排版，供列印或作為附件發送之用。",
  };

  await renderAndDownload(data, pdfFileName(input.caseTitle, ymd || todayYmd()));
}
