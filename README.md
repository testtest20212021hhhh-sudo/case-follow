# 陳情檔案 · Civic Advocacy Case Management System

以 Next.js (App Router) + TypeScript + Tailwind CSS + PostgreSQL 建立的政府陳情與倡議案件管理系統。
重點是**時間軸**、**書面／相片證據歸檔**，以及明確追蹤**發球權（action_required_by）**。

> 🚀 **部署上線請照 [`DEPLOYMENT.md`](./DEPLOYMENT.md)**：
> 全程 100% 網頁操作（Neon 網頁 SQL Editor → GitHub 網頁上傳 → Vercel 網頁 Import），
> **不需要安裝任何軟體、不需要終端機、不需要任何本地指令**。

## 架構原則：只用一個服務

所有資料（案件、時間軸全文、以及 PDF／照片附件）**只存放在 Neon 的 PostgreSQL 資料庫**：

```
瀏覽器（表單）
   │  上傳 PDF／照片 → 瀏覽器即時轉成 Base64 文字
   ▼
Next.js（Vercel） ──► Neon PostgreSQL
                      ├─ cases             案件（發球權、SLA 期限）
                      ├─ timeline_events   時間軸（全文、attachments_base64 Base64 附件）
```

- 附件欄位 `timeline_events.attachments_base64`（JSONB）內容形如：
  `[{"name":"政府回函.pdf","mimeType":"application/pdf","sizeBytes":123456,"data":"<Base64>"}]`
- 讀取時由瀏覽器還原為檔案預覽／下載，或用 jszip 打包成 ZIP。
- **不需要 Supabase Storage / Vercel Blob / S3，環境變數只有 `DATABASE_URL` 與 `SEED_DEMO_DATA`。**
- 限制（個人輕量專案可接受）：每個檔案 1.5 MB、每則紀錄最多 8 個附件（避開 Vercel 單次請求約 4.5 MB 的上限）。

## 功能

| 路徑 | 內容 |
| --- | --- |
| `/` | 總案件儀表板：統計、按部門／狀態／發球權／關鍵字篩選、逾期提示、每個案件的最後一則紀錄 |
| `/cases/pending` | 待辦專頁：① 等待政府回覆（按 SLA 排序、逾期紅標）② 需要我跟進 |
| `/cases/new` | 建立案件（React Hook Form + Zod），可勾選「送出時同時將本次輸入內容匯出為 PDF」 |
| `/cases/[id]` | 案件詳情：左側基本資料／發球權切換／附件庫，右側垂直時間軸（展開全文）、新增紀錄、編輯、匯出 ZIP |

- **時間軸**：依 `event_date` 新至舊排列，分為政府來函／我方去信／實地巡查／內部筆記；`full_content` 以「展開全文」顯示，換行原樣保留。
- **發球權**：`gov`（等待政府）／`user`（需要我跟進）／`none`（已結案），可在詳情頁一鍵切換，或在新增紀錄時同步更新狀態。
- **SLA**：以 `expected_reply_date` 相對今日計算逾期、今日到期、七日內、正常四種標示。
- **PDF 匯出**：表單送出時若剔選 Checkbox，會以 `@react-pdf/renderer` 把是次輸入（主旨、部門、時間、事件類型、摘要、詳細全文、附件清單）排成 A4 PDF 並自動下載，檔名 `[案件主旨]_[YYYY-MM-DD]_紀錄.pdf`；中文字型內建於 `public/fonts/`。
- **ZIP 匯出**：以 `jszip` + `file-saver` 把該案件所有附件依時間順序命名封裝，附 `_manifest.txt` 時間軸對照，檔名 `[案件編號]_[主旨]_Attachments.zip`。

## 目錄結構（摘要）

```
db/neon-schema.sql        Neon 建表 SQL（貼到 Neon 網頁 SQL Editor 執行）
public/fonts/             PDF 正體中文字型（NotoSansTC-Regular/Bold.woff）
src/app/                  頁面（儀表板、待辦、新增、詳情）與 API Route
src/components/           UI 元件（timeline、add-event-modal、export-*、表格卡片）
src/db/schema.ts          資料表定義（與 db/neon-schema.sql 對應）
src/lib/                  查詢、驗證、格式化、Base64 轉檔、PDF 生成、示範資料
```

完整逐檔說明見 [DEPLOYMENT.md 附錄 A](./DEPLOYMENT.md#附錄-a完整檔案結構與用途)。

## API

| Method | Endpoint | 說明 |
| --- | --- | --- |
| GET | `/api/cases?department=&status=&action=&q=` | 案件列表（含事件數／附件數／最後事件） |
| POST | `/api/cases` | 建立案件（Zod 驗證） |
| GET | `/api/cases/:id` | 案件 + 全部時間軸事件（含 Base64 附件） |
| PATCH | `/api/cases/:id` | 更新欄位／狀態／發球權 |
| POST | `/api/cases/:id/events` | 新增事件（可同時更新狀態與發球權，附件為 Base64 JSON） |
| GET | `/api/health` | 健康檢查；首次啟動且 `SEED_DEMO_DATA` 未設為 `false` 時會寫入示範個案 |

## 資料表

- `cases`：`gov_ref_number`, `department`, `title`, `location`, `status`（enum）, `action_required_by`（enum）, `submission_date`, `expected_reply_date`, `created_at`, `updated_at`
- `timeline_events`：`case_id`（FK, cascade）, `event_date`（timestamptz）, `event_type`（enum）, `description`, `full_content`, **`attachments_base64`（JSONB，Base64 附件陣列）**, `created_at`

## 環境變數

| 變數 | 說明 |
| --- | --- |
| `DATABASE_URL` | Neon 的 Pooled PostgreSQL 連線字串（含 `?sslmode=require`） |
| `SEED_DEMO_DATA` | `false`＝不寫入示範個案（正式站建議）；留空／`true`＝首次載入寫入 7 宗示範案件 |

設定方式見 [DEPLOYMENT.md 第 4 節](./DEPLOYMENT.md#4-環境變數總表只要兩個)。
