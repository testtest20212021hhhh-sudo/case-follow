import type {
  CaseRecord,
  StoredAttachment,
  TimelineEvent,
} from "@/lib/types";

export interface CreateEventPayload {
  eventDate: string;
  eventType: TimelineEvent["eventType"];
  description: string;
  fullContent?: string;
  attachments: StoredAttachment[];
  actionRequiredBy?: CaseRecord["actionRequiredBy"];
  status?: CaseRecord["status"];
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "請求失敗")
        : "請求失敗，請稍後再試。";
    throw new Error(message);
  }
  return (payload as { data: T } | null)?.data as T;
}

/** Client-side CRUD helpers shared by every interactive component. */
export const caseApi = {
  createCase(input: unknown) {
    return request<CaseRecord>("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  updateCase(id: string, patch: unknown) {
    return request<CaseRecord>(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  },

  createEvent(caseId: string, payload: CreateEventPayload) {
    return request<{ event: TimelineEvent; case: CaseRecord }>(
      `/api/cases/${caseId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },
};

export const MAX_FILE_BYTES = 1_600_000;

/**
 * 瀏覽器端把檔案轉成 Base64 文字（不經過任何外部儲存服務），
 * 之後隨表單其他欄位一併寫入 Neon 的 timeline_events.attachments_base64。
 */
export function fileToAttachment(file: File): Promise<StoredAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`讀取檔案失敗：${file.name}`));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.slice(result.indexOf(",") + 1);
      if (!base64) {
        reject(new Error(`檔案內容無效：${file.name}`));
        return;
      }
      resolve({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        data: base64,
      });
    };
    reader.readAsDataURL(file);
  });
}
