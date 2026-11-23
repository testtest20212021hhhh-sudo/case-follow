"use client";

import { useState } from "react";
import { Archive, Check, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  formatDateTime,
  formatBytes,
  formatYmdShort,
  sanitizeFilename,
  zipNameFor,
} from "@/lib/format";
import type { CaseRecord, StoredAttachment, TimelineEvent } from "@/lib/types";

type Status = "idle" | "working" | "done" | "error";

/** Base64 → Uint8Array（附件內容直接來自 Neon，毋須再從網路上下載） */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function uniqueName(used: Set<string>, baseName: string): string {
  let candidate = baseName;
  let suffix = 2;
  while (used.has(candidate)) {
    const dot = baseName.lastIndexOf(".");
    const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
    const ext = dot > 0 ? baseName.slice(dot) : "";
    candidate = `${stem}_${suffix}${ext}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function ExportAttachmentsButton({
  caseRecord,
  events,
}: {
  caseRecord: CaseRecord;
  events: TimelineEvent[];
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const total = events.reduce(
    (sum, event) => sum + event.attachments.length,
    0,
  );

  async function handleExport() {
    if (status === "working") return;
    setStatus("working");
    setMessage("正在打包附件…");

    try {
      const chronological = [...events].sort((a, b) =>
        a.eventDate.localeCompare(b.eventDate),
      );

      const archive = new JSZip();
      const used = new Set<string>();
      const manifest: string[] = [
        "陳情案件附件匯出 / Civic case attachments",
        "==========================================",
        `案件主旨：${caseRecord.title}`,
        `政府編號：${caseRecord.govRefNumber ?? "未提供"}`,
        `負責部門：${caseRecord.department}`,
        `地點：${caseRecord.location ?? "未提供"}`,
        `立案日期：${caseRecord.submissionDate}`,
        `預計回覆日期：${caseRecord.expectedReplyDate ?? "未設定"}`,
        `匯出時間：${formatDateTime(new Date().toISOString())}`,
        `附件總數：${total}`,
        "",
        "時間軸與附件對照：",
      ];

      let index = 0;
      let included = 0;

      for (const event of chronological) {
        manifest.push(
          "",
          `[${formatYmdShort(event.eventDate)}] (${event.eventType}) ${event.description}`,
        );

        for (const attachment of event.attachments as StoredAttachment[]) {
          index += 1;
          const baseName = `${String(index).padStart(2, "0")}_${formatYmdShort(
            event.eventDate,
          ).replace(/-/g, "")}_${sanitizeFilename(attachment.name, "attachment")}`;

          setMessage(`正在封裝附件 ${index} / ${total}…`);
          try {
            const fileName = uniqueName(used, baseName);
            archive.file(fileName, base64ToBytes(attachment.data));
            included += 1;
            manifest.push(
              `  - ${fileName}  （${formatBytes(attachment.sizeBytes)}）`,
            );
          } catch {
            manifest.push(`  ! 無法讀取：${attachment.name}`);
          }
        }
      }

      if (included === 0) {
        setStatus("error");
        setMessage("此案件尚未有可下載的附件。請先新增含附件的跟進紀錄。");
        return;
      }

      archive.file("_manifest.txt", manifest.join("\n"));
      const blob = await archive.generateAsync({ type: "blob" });
      saveAs(blob, zipNameFor(caseRecord));

      setStatus("done");
      setMessage(`已打包 ${included} 個附件`);
      window.setTimeout(() => {
        setStatus("idle");
        setMessage(null);
      }, 6000);
    } catch (error) {
      console.error("[export]", error);
      setStatus("error");
      setMessage("匯出失敗，請稍後再試。");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={status === "working"}
        className="btn-secondary btn-sm"
      >
        {status === "working" ? (
          <Loader2 className="size-3.5 animate-spin" strokeWidth={2.2} />
        ) : status === "done" ? (
          <Check className="size-3.5 text-teal-700" strokeWidth={2.4} />
        ) : (
          <Archive className="size-3.5" strokeWidth={2.1} />
        )}
        匯出全部附件
        <span className="rounded-full bg-paper-deep px-1.5 py-0.5 font-mono text-[10px] text-ink-soft">
          {total}
        </span>
      </button>
      {message ? (
        <p
          className={`text-[10.5px] leading-relaxed ${
            status === "error" ? "text-rose-700" : "text-ink-muted"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
