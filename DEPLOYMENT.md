# 部署指南 · DEPLOYMENT.md

> **陳情檔案 Civic Casework Archive**（政府陳情與倡議案件管理系統）
> Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL (Neon) · @react-pdf/renderer · jszip
>
> 本指南是 **100% 網頁操作**的 Step-by-Step 部署手冊：
> **全程不需要安裝任何軟體、不需要打開終端機、不需要任何本地指令。**
> 你只需要三個瀏覽器分頁：**Neon（資料庫）**、**GitHub（程式碼）**、**Vercel（網站託管）**。

---

## 先記住兩條設計原則（影響你的所有操作）

### 原則 1：全系統只用 Neon 一個服務

案件、時間軸全文、以及所有附件（PDF 回函、現場照片）**全部只存在 Neon 的 PostgreSQL 資料庫裡**：

- 附件在你上傳時，由**瀏覽器**轉成 **Base64 文字**，跟表單其他欄位一起寫入 `timeline_events.attachments_base64`（JSONB 欄位）。
- 讀取時再由瀏覽器還原成檔案預覽或打包成 ZIP 下載。
- **因此：不需要 Supabase Storage、不需要 Vercel Blob、不需要 S3、不需要任何檔案儲存服務的帳號或金鑰。**
- 整個系統的環境變數只有兩個（見 [第 4 節](#4-環境變數總表只要兩個)）。

> 因此帶來的合理限制（個人輕量專案可接受）：
> **每個檔案上限 1.5 MB、每則跟進紀錄最多 8 個附件**（Base64 會使體積增約三分之一，上限是為了避開 Vercel 單次請求約 4.5 MB 的限制）。政府公函 PDF、手機照片壓縮後通常都在這個範圍內。

### 原則 2：零本地指令

| 任務 | 在哪裡完成 |
| --- | --- |
| 建立資料表 | **Neon 網頁後台 → SQL Editor**，把 `db/neon-schema.sql` 整段貼上執行 |
| 放上程式碼 | **GitHub 網頁上傳**（拖曳資料夾）或 **GitHub Codespaces**（網頁版編輯器） |
| 部署網站 | **Vercel 網頁 → Import Project** → 連結 GitHub → 填環境變數 → Deploy |
| 更新網站 | 在 GitHub 網頁上改檔案或重新上傳 → Vercel 自動重新部署 |
| 看錯誤 | Vercel 網頁後台的 Logs、Neon 網頁後台的 SQL Editor |

---

## 全流程 10 分鐘總覽

```
① Neon 網頁：建立專案 → 複製 DATABASE_URL → SQL Editor 貼上 db/neon-schema.sql → Run
② GitHub 網頁：建立 Repository → 把整包程式碼資料夾拖曳上傳（不含 .env）
③ Vercel 網頁：Import 那個 GitHub Repository → 填 2 個環境變數 → Deploy
④ 瀏覽器打開 https://你的專案.vercel.app/api/health → 看到 {"ok":true} 即成功
```

以下逐一詳細說明。

---

## 1. 資料庫：Neon 網頁版建立與建表

### 1-1 建立 Neon 專案

1. 瀏覽器打開 **<https://neon.tech>** → 點 **Sign up**（可用 GitHub 或 Google 帳號登入，之後 GitHub/Vercel 連動會更順）。
2. 登入後點 **Create project**（或 **New Project**），填寫：
   - **Project name**：`civic-casework`
   - **Postgres version**：保持預設
   - **Region**：選 **AWS ap-southeast-1 (Singapore)**，距離香港最近、延遲最低
   - **Database name**：`neondb`（保持預設）
3. 按 **Create project**，等候數秒完成。

### 1-2 複製 DATABASE_URL（重要：有兩種，用哪一條？）

專案頁面右上按 **Connect**（或 **Connection Details**），會看到兩段連線字串：

| 名稱 | 主機名特徵 | 用途 |
| --- | --- | --- |
| **Pooled connection** | 主機名含 **`-pooler`** | ✅ **要填到 Vercel 的就是這條**（網站連線用） |
| **Direct connection** | 主機名不含 `-pooler` | 一般備用；本流程用不到 |

1. 在 **Pooled connection** 旁按 **Copy**。
2. 字串長這樣（請用你自己的）：
   `postgresql://neondb_owner:你的密碼@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
3. **先貼到記事本備用**，並檢查結尾一定有 **`?sslmode=require`**（Neon 必須加密連線，少了會連不上）。
4. 密碼只顯示一次；若遺失：左側 **Roles** → 你的角色 → **Reset password** 再重新複製。

> 💡 這個字串等於資料庫的「帳號＋密碼」，**只能貼到 Vercel 的環境變數欄，絕不可以放在 GitHub 的檔案裡**。

### 1-3 建立資料表：把 SQL 貼到 Neon 的 SQL Editor

1. 左側選單點 **SQL Editor** → **New query**（新查詢）。
2. 在另一個分頁打開本專案的檔案 **`db/neon-schema.sql`**（在 GitHub 網頁上點開該檔案，按右上角的「複製原始碼」圖示即可整份複製）。
3. 把整份 SQL **貼入 SQL Editor 的輸入區**。
4. 右下按 **Run**（或按鍵盤執行鍵）。畫面下方出現 **`Success`** 即完成。

> 這份 SQL 是**可重複執行**的：跑第二次不會出錯，適合日後再貼一次補充資料表。

SQL 內容會建立：

- 三個列舉型態（`case_status`、`action_required_by`、`timeline_event_type`）
- `cases` 案件表（含 `action_required_by` 發球權、`expected_reply_date` SLA）
- `timeline_events` 時間軸表（含 `full_content` 全文、**`attachments_base64` Base64 附件**）
- 各項索引與 `updated_at` 自動更新觸發器

### 1-4 用 SQL Editor 驗證建表成功（複製這段貼上執行）

```sql
select table_name
  from information_schema.tables
 where table_schema = 'public'
 order by table_name;

select count(*) as attachment_column_ready
  from information_schema.columns
 where table_name = 'timeline_events'
   and column_name = 'attachments_base64';
```

- 第一段應列出：`cases`、`timeline_events`
- 第二段應回傳 **`1`**

任何一段不符合，代表貼上時 SQL 沒有完整執行（常見是貼漏最後幾行），請整份重新貼上再按 Run 一次。

### 1-5 Neon 後台幾件要知道的事

| 主題 | 說明 |
| --- | --- |
| 休眠 | 免費方案資料庫閒置一段時間會暫停，下次開啟稍慢（約 1–2 秒），功能不受影響 |
| 容量 | 免費方案約 0.5 GB。Base64 附件會佔較多空間（約為原檔 1.35 倍）；大約可存放 200–1000 份 PDF／照片 |
| 還原 | 左側 **Branches / Backups** 可建立分支作為快照，或把資料庫還原到某個時間點 |
| 匯出資料 | SQL Editor 貼上 `select * from cases;` → 結果右上 **Download CSV** 即可備份成試算表 |

---

## 2. 程式碼上傳到 GitHub（純網頁操作）

> 你手上應該已收到**完整的專案資料夾**（所有檔案已寫好，不需要補任何東西）。
> 請先核對 [附錄 A 的完整檔案清單](#附錄-a完整檔案結構與用途)，確認檔案齊全。

### 2-1 建立 GitHub 帳號與 Repository

1. 打開 **<https://github.com>** → 註冊或登入。
2. 點右上角 **＋** → **New repository**。
3. 填寫：
   - **Repository name**：`civic-casework`
   - 選 **Private**（強烈建議，因為這是你的個案資料）
   - **不要**勾選 "Add a README file"、"Add .gitignore"、"Choose a license"
4. 按 **Create repository**。畫面會出現上傳方式說明，先留著。

### 2-2 上傳程式碼：三種純網頁做法（選一種）

#### 做法 A：整包拖曳上傳（最快，推薦）

1. 在剛建立的 Repository 頁面，點 **uploading an existing file**（或 **Add file → Upload files**）。
2. 打開電腦裡的專案資料夾，**先刪除 `.env` 檔**（有密碼，絕對不可上傳；`.env` 在你收到的包裹裡）。
3. 把資料夾內的**所有檔案與資料夾**（`src`、`db`、`public`、`package.json` 等）**全部拖曳到網頁的虛線框內**。
4. 等待上傳完成，網頁會顯示檔案清單。**逐項核對**：
   - `src/` 底下要有 `app`、`components`、`lib`、`db` 四個資料夾
   - `public/fonts/` 底下要有 `NotoSansTC-Regular.woff` 與 `NotoSansTC-Bold.woff`（PDF 中文靠它）
   - `db/neon-schema.sql`、`package.json`、`DEPLOYMENT.md` 都在
5. 下方輸入提交訊息（例如 `初始版本：陳情檔案系統`）→ 按 **Commit changes**。

> ⚠️ 常見漏檔：GitHub 網頁拖曳**子資料夾**時，偶爾只上傳檔案不保留資料夾層級。
> 請在上傳後點開 `src` → 看到 `app`、`components`、`lib`、`db` 才算成功；
> 若層級亂掉，請改用做法 B 或 C。

#### 做法 B：逐檔新增並貼上內容

1. Repository 頁面 → **Add file → Create new file**。
2. 頂端輸入檔案路徑（例如 `src/app/page.tsx`，用 `/` 分隔會自動建立資料夾）。
3. 把對應檔案的內容**整個複製貼上**到編輯區 → 右上 **Commit → Commit changes**。
4. 重複直到 [附錄 A](#附錄-a完整檔案結構與用途) 的所有檔案都建立完成。
   （`.woff` 字型檔是二進位檔無法貼上，此情況請用做法 A，或先用做法 C 的上傳功能。）

#### 做法 C：GitHub Codespaces（瀏覽器內的完整開發環境）

1. Repository 首頁 → 綠色 **Code** 按鈕 → **Codespaces** 分頁 → **Create codespace on main**。
2. 會在瀏覽器開出一個雲端開發環境（Visual Studio Code 網頁版）。
3. 左側檔案總管：右鍵 → **Upload...** 把整個專案資料夾上傳（這會保留完整資料夾結構，最穩妥）。
4. 上傳完後，左側 **Source Control**（分支圖示）→ 輸入訊息 → 按 **Commit & Sync**（或 **Publish to GitHub**），就寫入 GitHub 了。
5. 完成後可關閉分頁；下次要改檔案時，回 Repository 頁面按 **Code → Codespaces → 你的 codespace** 繼續。

> Codespaces 之後也可以用來改程式碼：在網頁編輯器改完 → Source Control 輸入訊息 → **Commit & Sync** → Vercel 會自動重新部署。

### 2-3 上傳後的安全檢查（一定要做）

1. 在 GitHub Repository 頁面右上搜尋欄（或按鍵盤 `/`）搜尋 `neondb_owner`。
2. **必須搜尋不到任何結果**。若找得到，代表資料庫密碼被上傳了：
   - 立刻到 Neon → **Roles → Reset password** 換密碼
   - 到 GitHub 刪除該檔案，並在 Repository **Settings → Security → Secret scanning** 查看警訊
3. 確認 `package-lock.json` 有上傳（Vercel 靠它取得完全一致的套件版本）。

---

## 3. 網站託管：Vercel 網頁部署

### 3-1 註冊並連結 GitHub

1. 打開 **<https://vercel.com>** → **Sign up** → 選 **Continue with GitHub**（授權時可只勾選 `civic-casework` 這個 Repository）。
2. 進入 Dashboard → 右上 **Add New…** → **Project**。
3. 在 **Import Git Repository** 區塊找到 **civic-casework** → 按 **Import**。
   （看不到？按 **Adjust GitHub App Permissions**，授權這個 Private repo。）

### 3-2 填寫設定與環境變數（關鍵步驟）

在 **Configure Project** 頁面：

| 欄位 | 填寫 |
| --- | --- |
| **Project Name** | `civic-casework`（或任何名字，會成為網址的一部分） |
| **Framework Preset** | **Next.js**（自動偵測，不需手動改） |
| **Root Directory** | `./`（保持預設） |
| **Build Command / Output / Install** | **全部留空**（Vercel 會自動安裝套件與建置，你不用理會） |

接著展開 **Environment Variables**，新增兩個（照抄，值要換成你的）：

| Name | Value | 說明 |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://neondb_owner:密碼@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` | 第 1-2 步複製的 **Pooled** 連線字串（主機名含 `-pooler`、結尾含 `?sslmode=require`） |
| `SEED_DEMO_DATA` | `false` | 關閉示範個案自動寫入，讓你的正式站從空白開始 |

> 💡 也可先按 **Deploy**，再到專案的 **Settings → Environment Variables** 再補填（填完在 Deployments 頁按 **⋯ → Redeploy** 生效）。
> 🔴 這是**整個系統僅有的兩個環境變數**。沒有任何 Storage、API Key、Token 需要設定。

### 3-3 按 Deploy，等候完成

1. 按 **Deploy**，等待約 1–3 分鐘（Vercel 顯示建置進度動畫）。
2. 成功會出現「Congratulations!」與預覽圖，下方有網址 `https://civic-casework-xxxx.vercel.app`。
3. 若失敗：點 **Building Logs** 看紅字，最常見原因見 [第 6 節](#6-疑難排解全部用網頁後台處理)。

### 3-4 驗收

1. 瀏覽器打開 `https://你的專案.vercel.app/api/health` → 應顯示 `{"ok":true,"service":"civic-casework"}`。
2. 打開首頁 `https://你的專案.vercel.app` → 應看到「陳情檔案」儀表板（空白狀態，因為已關閉示範資料）。
3. 走一次 [第 5 節驗收清單](#5-上線後驗收清單逐項打勾)。

### 3-5 之後如何更新（仍然純網頁）

| 想做的事 | 操作 |
| --- | --- |
| 改文字或程式 | GitHub 網頁點開檔案 → 鉛筆圖示 **Edit** → 改完 → **Commit changes** → Vercel 自動重新部署（約 1–2 分鐘） |
| 上傳新檔案／整包替換 | Repository → **Add file → Upload files** 重新上傳，同名檔會覆蓋 |
| 看部署狀態 | Vercel 專案 → **Deployments**：綠色 `Ready` = 成功 |
| 回復舊版本 | Vercel → **Deployments** → 點舊版本 → 右上 **⋯ → Promote to Production**（即時生效） |
| 改資料表 | Neon → **SQL Editor** 貼上對應 SQL 執行（見 [7-1](#7-1修改資料表結構)） |

### 3-6 綁定自己的網域（可選）

1. Vercel 專案 → **Settings → Domains → Add**，輸入網域名稱（例如 `cases.example.com`）。
2. 依畫面指示到你的網域註冊商後台設定：
   - 子網域（如 `cases`）：新增 **CNAME** 記錄指向 `cname.vercel-dns.com`
   - 根網域（如 `example.com`）：新增 **A** 記錄指向 `76.76.21.21`
3. 回 Vercel 等待驗證，HTTPS 憑證會自動簽發。

---

## 4. 環境變數總表（只要兩個）

| 變數名稱 | 必填 | 在哪裡取 | 填什麼 | 不填會怎樣 |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | Neon → 專案 → **Connect** → **Pooled connection** 複製 | 完整連線字串，含密碼與 `?sslmode=require` | 網站啟動即失敗，`/api/health` 回 `{"ok":false}` |
| `SEED_DEMO_DATA` | ✅ 建議 | 自己輸入 | `false`（正式站）；留空或 `true` 會寫入 7 宗示範個案供你先熟悉系統 | 首次開啟會自動寫入示範資料 |

**Vercel 設定位置**：專案 → **Settings → Environment Variables**。
建議把兩個變數都勾選 **Production**、**Preview**、**Development** 三種環境（Preview 是每個分支的預覽網址）。
**Storage 類型的 API Key（Supabase / Blob / S3）：本系統一個都不需要。**

---

## 5. 上線後驗收清單（逐項打勾）

- [ ] `/api/health` 顯示 `{"ok":true,"service":"civic-casework"}`
- [ ] 首頁儀表板正常顯示（空白狀態，0 宗案件）
- [ ] `/cases/pending` 兩個區塊（等待政府回覆／需要我跟進）正常顯示
- [ ] `/cases/new` 填一宗測試案件 → 送出 → 跳轉到案件詳情
- [ ] 案件詳情頁 → **新增跟進紀錄** → 輸入摘要與詳細全文 → 送出 → 時間軸出現該紀錄
- [ ] 同一 Modal 內拖曳一個 PDF 與一張照片 → 送出 → 附件可點擊開啟／下載
- [ ] 剔選「送出時同時將本次輸入內容匯出為 PDF」→ 送出 → 自動下載 `主旨_日期_紀錄.pdf`
- [ ] 打開該 PDF：中文字正常（不是方框）、A4 版面、有頁碼
- [ ] 時間軸「展開全文」可展開／收起完整陳情書內容
- [ ] 「匯出全部附件」→ 下載 ZIP，解壓後含所有 PDF/照片與 `_manifest.txt`
- [ ] 左側發球權切換（政府／我方／結案）→ 重新整理後狀態正確
- [ ] 篩選（部門、狀態、發球權、關鍵字）結果正確
- [ ] 手機或瀏覽器 375px 寬度下版面不破版

---

## 6. 疑難排解（全部用網頁後台處理）

| 症狀 | 可能原因 | 網頁上的解法 |
| --- | --- | --- |
| `/api/health` 顯示 `{"ok":false}` | `DATABASE_URL` 錯誤、缺 `?sslmode=require`、或用了 Direct 字串 | Vercel → Deployments → 最新一次 → **Runtime Logs** 看錯誤；到 Neon 重新複製 **Pooled** 字串，回 **Settings → Environment Variables** 更新後 **Redeploy** |
| 網站顯示資料表不存在的錯誤 | Neon 還沒建表 | 回 Neon **SQL Editor**，把 `db/neon-schema.sql` 完整貼上再 Run；用 1-4 的驗證 SQL 確認 |
| Deploy 建置失敗（Build 頁紅字） | 上傳漏檔案、資料夾層級錯誤 | Vercel **Building Logs** 會顯示缺哪個檔案；到 GitHub 用 **Upload files** 補上該檔案後自動重建 |
| PDF 中文變成方框或空白 | `public/fonts/` 的兩個字型檔沒上傳成功 | 直接開 `https://你的網域/fonts/NotoSansTC-Regular.woff` 應顯示下載檔；若 404，到 GitHub 補上 `public/fonts/` 兩個 `.woff` 檔 |
| 傳大檔出現錯誤訊息 | 超過 1.5 MB 上限（設計如此） | 用手機相簿「儲存為小尺寸」或 PDF 壓縮工具降壓後再上傳；上限可於 `src/lib/validation.ts` 內 `sizeBytes` 的數值調整 |
| ZIP 下載後檔案打不開 | 該附件本身已損壞 | 在時間軸直接點該附件下載原始檔測試；若一樣壞，請重新上傳 |
| 網站第一個畫面很慢 | Neon 免費方案休眠中 | 正常現象，等 1–2 秒；不影響功能 |
| 首頁出現不想看到的示範案件 | `SEED_DEMO_DATA` 未設為 `false` | 設為 `false` 後 **Redeploy**，並在 Neon **SQL Editor** 執行 `truncate table cases cascade;`（會一併清空時間軸） |
| 想知道是哪次改動出錯 | — | Vercel **Deployments** 每次部署都有獨立網址與 Logs，逐次對照即可 |

**看 Log 的位置**：Vercel 專案 → **Deployments** → 點最新部署 → 上方 **Building / Runtime Logs**。
**看資料的**位置：Neon → **SQL Editor** 執行 `select * from cases order by updated_at desc limit 20;`。

---

## 7. 日常維護

### 7-1 修改資料表結構

1. 想好要加的欄位，例如在案件加 `priority`：
2. Neon → **SQL Editor** 貼上並執行：

   ```sql
   alter table cases add column if not exists priority text;
   ```

3. 對應修改程式內的型別定義（`src/db/schema.ts` 與 `src/lib/types.ts`）並上傳 GitHub → Vercel 自動重新部署。
4. 記得把這個 `alter table` 指令記在你的筆記裡，方便日後在新資料庫重現結構。
   （也可以整份 `db/neon-schema.sql` 更新後重新貼上執行，檔案本身可重複執行。）

### 7-2 備份

- **自動**：Neon 免費方案本身保留一段時間的還原點（**Branches / Backups**）。
- **手動**：Neon → **SQL Editor** 執行 `select * from cases;` → 結果右上 **Download CSV**；附件請用「匯出全部附件 ZIP」功能在網站內逐案打包。
- **快照**：左側 **Branches → New branch** 建立分支，相當於把整份資料庫凍結保存。

### 7-3 回復

| 類型 | 操作 |
| --- | --- |
| 網站程式 | Vercel → Deployments → 舊版本 → **⋯ → Promote to Production** |
| 資料庫 | Neon → **Branches / Backups → Restore** 選時間點還原 |

### 7-4 安全檢查（上線後一週內做一次）

- [ ] GitHub 全庫搜尋 `neondb_owner` 與 `sslmode`：結果**不應**出現任何檔案內容
- [ ] Repository 為 **Private**
- [ ] Neon 與 Vercel 帳號皆開啟**雙重驗證**
- [ ] 網站目前無登入機制（個人專用）；若要公開給他人，請務必先加入登入與權限控制

---

## 附錄 A：完整檔案結構與用途

上傳 GitHub 時請逐項核對（`.env` **不要**上傳）：

```
civic-casework/
├── DEPLOYMENT.md                        本部署指南（網頁操作版）
├── README.md                            系統說明、功能、架構
├── package.json                         套件清單與專案設定（Vercel 會自動讀取）
├── package-lock.json                    套件版本鎖定檔（必須上傳）
├── next.config.ts                       Next.js 設定
├── tsconfig.json                        TypeScript 設定
├── postcss.config.mjs                   Tailwind CSS 4 設定
├── eslint.config.mjs                    程式碼檢查設定
├── drizzle.config.json                  資料庫 ORM 設定（本流程用不到，僅供維護參考）
│
├── db/
│   └── neon-schema.sql                  ★ Neon 建表 SQL（貼到 SQL Editor 執行）
│
├── public/
│   └── fonts/
│       ├── NotoSansTC-Regular.woff      ★ PDF 正體中文字型（一般字重）
│       └── NotoSansTC-Bold.woff         ★ PDF 正體中文字型（粗體）
│
└── src/
    ├── app/
    │   ├── layout.tsx                   全站版面、字型載入
    │   ├── globals.css                  設計系統（紙感底色、按鈕、欄位樣式）
    │   ├── page.tsx                     總案件儀表板（統計、篩選、案件列表）
    │   ├── not-found.tsx                找不到頁面
    │   ├── cases/
    │   │   ├── pending/page.tsx         待辦與追蹤專頁（等待政府／需要我跟進）
    │   │   ├── new/page.tsx             新增案件頁
    │   │   └── [id]/page.tsx            案件詳情＋垂直時間軸
    │   └── api/
    │       ├── health/route.ts          健康檢查（回 {"ok":true}）
    │       └── cases/
    │           ├── route.ts             案件列表／新增
    │           └── [id]/
    │               ├── route.ts         單一案件讀取／更新（含發球權切換）
    │               └── events/route.ts  新增跟進紀錄（含 Base64 附件）
    │
    ├── components/
    │   ├── site-header.tsx              頁首導覽
    │   ├── ui.tsx                       徽章、統計卡、資料列等共用元件
    │   ├── filter-bar.tsx               篩選列
    │   ├── case-row.tsx                 案件列表項目
    │   ├── pending-case-card.tsx        待辦卡片（SLA 逾期標示）
    │   ├── case-toolbar.tsx             案件操作列（新增紀錄／匯出 ZIP／編輯）
    │   ├── case-fields.tsx              案件表單欄位
    │   ├── new-case-form.tsx            新增案件表單＋PDF 匯出 Checkbox
    │   ├── edit-case-modal.tsx          編輯案件彈窗
    │   ├── add-event-modal.tsx          新增跟進紀錄（含 Base64 附件轉檔）
    │   ├── timeline.tsx                 垂直時間軸（展開全文、附件下載）
    │   ├── ball-in-court-control.tsx    發球權一鍵切換
    │   ├── export-attachments-button.tsx ZIP 匯出全部附件
    │   ├── export-pdf-checkbox.tsx      「匯出為 PDF」勾選框
    │   └── modal.tsx                    通用彈窗
    │
    ├── db/
    │   ├── index.ts                     資料庫連線（讀取 DATABASE_URL）
    │   └── schema.ts                    資料表定義（與 neon-schema.sql 對應）
    │
    └── lib/
        ├── types.ts                     全站型別（案件、事件、Base64 附件）
        ├── queries.ts                   查詢與統計（列表、詳情、儀表板數字）
        ├── api-client.ts                前端寫入工具（含檔案→Base64 轉換）
        ├── validation.ts                表單與 API 驗證規則（含附件大小上限）
        ├── case-form.ts                 案件表單規則與預設值
        ├── format.ts                    日期、SLA、檔名、Base64 data URL 工具
        ├── seed.ts                      示範資料（SEED_DEMO_DATA 控制）
        └── pdf/
            ├── record-document.tsx      PDF 文件版面（A4、字型註冊）
            └── export-record.ts         PDF 生成與下載（表單內容轉 PDF）
```

> ⚠️ 兩個最常被漏掉的檔案：`db/neon-schema.sql`（沒貼就沒資料表）與 `public/fonts/` 兩個 `.woff`（沒上傳 PDF 中文會變方框）。

## 附錄 B：最短路徑 Checklist

1. ☐ **Neon 網頁**：Create project（Singapore）→ Connect → 複製 **Pooled** 連線字串（含 `?sslmode=require`）
2. ☐ **Neon 網頁**：SQL Editor → 貼上 `db/neon-schema.sql` → **Run** → 用 1-4 的 SQL 確認
3. ☐ **GitHub 網頁**：New repository（Private）→ **Upload files** 拖入整包程式碼（**刪除 `.env` 再上傳**）→ Commit
4. ☐ **GitHub 網頁**：搜尋 `neondb_owner` 確認密碼沒有洩漏
5. ☐ **Vercel 網頁**：Add New → Project → Import 該 Repository
6. ☐ **Vercel 網頁**：Environment Variables 新增 `DATABASE_URL`、`SEED_DEMO_DATA=false` → **Deploy**
7. ☐ 瀏覽器開 `https://你的專案.vercel.app/api/health` 看到 `{"ok":true}`
8. ☐ 走完 [第 5 節驗收清單](#5-上線後驗收清單逐項打勾)，並建立第一宗真實個案

完成後，你只會繼續用三個網站後台：**Neon（資料）**、**GitHub（程式）**、**Vercel（部署）**，再也不需要安裝任何東西。
