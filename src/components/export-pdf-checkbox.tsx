"use client";

import { FileDown, Loader2 } from "lucide-react";

export function ExportPdfCheckbox({
  checked,
  onChange,
  busy = false,
  id = "export-pdf",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  busy?: boolean;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border px-2.5 py-2 text-[11.5px] transition ${
        checked
          ? "border-brand/50 bg-brand-soft text-brand-dark"
          : "border-line-strong bg-white text-ink-soft hover:border-brand/40"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 accent-[#12433b]"
      />
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" strokeWidth={2.2} />
      ) : (
        <FileDown className="size-3.5" strokeWidth={2.1} />
      )}
      <span className="leading-tight">
        送出時同時將本次輸入內容匯出為 PDF
        <span className="ml-1 text-[10px] text-ink-muted">(Export input as PDF)</span>
      </span>
    </label>
  );
}
