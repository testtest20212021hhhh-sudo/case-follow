"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { AddEventModal } from "@/components/add-event-modal";
import { EditCaseModal } from "@/components/edit-case-modal";
import { ExportAttachmentsButton } from "@/components/export-attachments-button";
import { caseReference } from "@/lib/format";
import type { CaseRecord, TimelineEvent } from "@/lib/types";

export function CaseToolbar({
  caseRecord,
  events,
}: {
  caseRecord: CaseRecord;
  events: TimelineEvent[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="btn-primary btn-sm"
      >
        <Plus className="size-3.5" strokeWidth={2.4} />
        新增跟進紀錄
      </button>
      <ExportAttachmentsButton caseRecord={caseRecord} events={events} />
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="btn-secondary btn-sm"
      >
        <Pencil className="size-3.5" strokeWidth={2.1} />
        編輯案件
      </button>

      <AddEventModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        caseId={caseRecord.id}
        caseTitle={caseRecord.title}
        caseReference={caseReference(caseRecord)}
        department={caseRecord.department}
        location={caseRecord.location}
        currentAction={caseRecord.actionRequiredBy}
        currentStatus={caseRecord.status}
      />
      <EditCaseModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        caseRecord={caseRecord}
      />
    </div>
  );
}
