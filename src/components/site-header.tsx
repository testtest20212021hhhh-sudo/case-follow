"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ClipboardList, LayoutGrid, Plus } from "lucide-react";

const NAV = [
  { href: "/", label: "總案件", icon: LayoutGrid },
  { href: "/cases/pending", label: "待辦與追蹤", icon: ClipboardList },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-paper shadow-[0_8px_20px_-14px_rgba(11,45,40,1)]">
            <Archive className="size-5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block font-serif text-[17px] font-semibold leading-tight tracking-tight text-ink">
              陳情檔案
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-ink-muted">
              Civic Casework
            </span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex" aria-label="主要導覽">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition ${
                  active
                    ? "bg-brand-soft font-medium text-brand-dark"
                    : "text-ink-soft hover:bg-paper-deep/70 hover:text-ink"
                }`}
              >
                <item.icon className="size-4" strokeWidth={1.9} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/cases/new" className="btn-primary btn-sm sm:px-4 sm:py-2.5 sm:text-sm">
            <Plus className="size-4" strokeWidth={2.2} />
            <span className="hidden sm:inline">新增案件</span>
            <span className="sm:hidden">新增</span>
          </Link>
        </div>
      </div>

      <nav
        className="flex items-center gap-1 overflow-x-auto border-t border-line/70 px-4 pb-2 pt-1 sm:hidden"
        aria-label="手機導覽"
      >
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
                active
                  ? "bg-brand-soft font-medium text-brand-dark"
                  : "text-ink-soft"
              }`}
            >
              <item.icon className="size-3.5" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
