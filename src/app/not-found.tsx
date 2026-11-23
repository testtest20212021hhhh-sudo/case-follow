import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
        <FileQuestion className="size-6" strokeWidth={1.8} />
      </span>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">
        找不到這個檔案
      </h1>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
        案件可能已被刪除，或網址中的案件編號不正確。請回到案件總覽重新選擇。
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/" className="btn-primary btn-sm">
          所有案件
        </Link>
        <Link href="/cases/pending" className="btn-secondary btn-sm">
          待辦與追蹤
        </Link>
      </div>
    </div>
  );
}
