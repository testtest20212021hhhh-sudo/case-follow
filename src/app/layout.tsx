import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "陳情檔案 · 政府陳情與倡議案件管理",
  description:
    "有條理地紀錄向香港政府部門提交的投訴與倡議，追蹤時間軸、證據附件與目前發球權。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-line/80 bg-paper-deep/40">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>
              陳情檔案 · Civic Casework Archive｜所有個案由人手輸入，附件與時間軸一併歸檔。
            </p>
            <p className="font-mono text-[11px] tracking-wide">
              PostgreSQL · Drizzle ORM · Next.js App Router
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
