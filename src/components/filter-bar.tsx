import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  ACTION_META,
  CASE_STATUSES,
  DEPARTMENTS,
  STATUS_META,
} from "@/lib/types";

interface FilterBarProps {
  basePath: string;
  current: {
    q?: string;
    department?: string;
    status?: string;
    action?: string;
  };
  resultCount: number;
}

export function FilterBar({ basePath, current, resultCount }: FilterBarProps) {
  const hasFilters = Boolean(
    current.q || current.department || current.status || current.action,
  );

  return (
    <form
      action={basePath}
      method="get"
      className="card flex flex-col gap-3 px-3.5 py-3.5 lg:flex-row lg:items-center"
    >
      <div className="flex items-center gap-2 text-ink-muted">
        <SlidersHorizontal className="size-4" strokeWidth={1.9} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
          篩選
        </span>
      </div>

      <label className="relative flex min-w-0 flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-ink-muted" strokeWidth={2} />
        <input
          type="search"
          name="q"
          defaultValue={current.q ?? ""}
          placeholder="搜尋主旨、地點、政府編號…"
          className="field-input py-2 pl-9 text-[13px]"
          aria-label="搜尋案件"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
        <select
          name="department"
          defaultValue={current.department ?? ""}
          className="field-input cursor-pointer py-2 text-[12.5px]"
          aria-label="負責部門"
        >
          <option value="">所有部門</option>
          {DEPARTMENTS.map((department) => (
            <option key={department.code} value={department.code}>
              {department.code} · {department.short}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={current.status ?? ""}
          className="field-input cursor-pointer py-2 text-[12.5px]"
          aria-label="案件狀態"
        >
          <option value="">所有狀態</option>
          {CASE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_META[status].label}
            </option>
          ))}
        </select>

        <select
          name="action"
          defaultValue={current.action ?? ""}
          className="field-input cursor-pointer py-2 text-[12.5px]"
          aria-label="發球權"
        >
          <option value="">發球權：全部</option>
          <option value="gov">{ACTION_META.gov.label}</option>
          <option value="user">{ACTION_META.user.label}</option>
          <option value="none">{ACTION_META.none.label}</option>
        </select>
      </div>

      <div className="flex items-center gap-2 lg:ml-auto">
        <span className="hidden text-[11.5px] text-ink-muted sm:inline">
          {resultCount} 個結果
        </span>
        <button type="submit" className="btn-primary btn-sm">
          套用
        </button>
        {hasFilters ? (
          <Link href={basePath} className="btn-quiet btn-sm" aria-label="清除篩選">
            <X className="size-3.5" strokeWidth={2.2} />
            清除
          </Link>
        ) : null}
      </div>
    </form>
  );
}
