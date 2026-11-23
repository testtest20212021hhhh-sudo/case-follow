"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { ActionBadge } from "@/components/ui";
import { caseApi } from "@/lib/api-client";
import {
  ACTION_META,
  DEFAULT_STATUS_BY_ACTION,
  type ActionRequiredBy,
  type CaseStatus,
} from "@/lib/types";

export function BallInCourtControl({
  caseId,
  currentAction,
  currentStatus,
}: {
  caseId: string;
  currentAction: ActionRequiredBy;
  currentStatus: CaseStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<ActionRequiredBy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function switchTo(next: ActionRequiredBy) {
    if (next === currentAction || pending) return;
    setPending(next);
    setError(null);
    setSaved(null);

    let nextStatus: CaseStatus | undefined;
    if (next === "none") {
      nextStatus = "closed";
    } else if (next === "user") {
      nextStatus = "replied_pending_user";
    } else if (currentStatus === "closed" || currentStatus === "submitted") {
      nextStatus = DEFAULT_STATUS_BY_ACTION.gov;
    }

    try {
      await caseApi.updateCase(caseId, {
        actionRequiredBy: next,
        ...(nextStatus ? { status: nextStatus } : {}),
      });
      setSaved(`發球權已改為「${ACTION_META[next].label}」`);
      router.refresh();
      window.setTimeout(() => setSaved(null), 4000);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新失敗");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface px-3.5 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="panel-label">
          <span className="size-1.5 rounded-full bg-brand" />
          目前發球權
        </p>
        <ActionBadge action={currentAction} />
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-xl bg-paper p-1">
        {(["gov", "user", "none"] as ActionRequiredBy[]).map((key) => {
          const active = currentAction === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => switchTo(key)}
              disabled={Boolean(pending)}
              className={`flex items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[11px] font-medium transition disabled:opacity-70 ${
                active
                  ? key === "gov"
                    ? "bg-teal-700 text-white shadow-sm"
                    : key === "user"
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-ink text-white shadow-sm"
                  : "text-ink-soft hover:bg-white"
              }`}
              aria-pressed={active}
            >
              {pending === key ? (
                <Loader2 className="size-3 animate-spin" strokeWidth={2.4} />
              ) : active ? (
                <Check className="size-3" strokeWidth={2.6} />
              ) : null}
              {ACTION_META[key].short}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
        {ACTION_META[currentAction].hint}
      </p>
      {saved ? (
        <p className="mt-1.5 text-[10.5px] font-medium text-teal-800">{saved}</p>
      ) : null}
      {error ? (
        <p className="mt-1.5 text-[10.5px] font-medium text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
