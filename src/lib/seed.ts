import { sql } from "drizzle-orm";
import { db } from "@/db";
import { cases, timelineEvents, type StoredAttachment } from "@/db/schema";
import type { ActionRequiredBy, CaseStatus, EventType } from "@/lib/types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const TZ_OFFSET = "+08:00";

function hkToday(): Date {
  return new Date();
}

function shiftYmd(offsetDays: number): string {
  const now = hkToday();
  const hkNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  hkNow.setUTCDate(hkNow.getUTCDate() + offsetDays);
  return hkNow.toISOString().slice(0, 10);
}

function isoAt(offsetDays: number, hour: number, minute = 0): string {
  const ymd = shiftYmd(offsetDays);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${ymd}T${hh}:${mm}:00${TZ_OFFSET}`;
}

/* -------------------------------------------------------------------------- */
/*  Minimal, dependency-free PDF / SVG evidence generators                     */
/* -------------------------------------------------------------------------- */

function escapePdfText(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildSamplePdf(title: string, lines: string[]): Buffer {
  const content = [
    "BT /F1 16 Tf 56 780 Td (" + escapePdfText(title) + ") Tj ET",
    ...lines.map(
      (line, index) =>
        `BT /F1 10 Tf 56 ${748 - index * 18} Td (${escapePdfText(line)}) Tj ET`,
    ),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

function buildFieldNoteSvg(caption: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
  <rect width="960" height="600" fill="#e8e4da"/>
  <rect x="40" y="40" width="880" height="440" fill="#f5f2ea" stroke="#1c2a26" stroke-width="2"/>
  <path d="M40 360 L260 300 L520 330 L920 250" stroke="#9aa39d" stroke-width="3" fill="none"/>
  <path d="M40 400 L920 330" stroke="#c2b8a5" stroke-width="26" fill="none"/>
  <circle cx="430" cy="330" r="52" fill="#d97706" opacity="0.22" stroke="#b45309" stroke-width="3"/>
  <text x="430" y="336" font-family="Helvetica" font-size="18" fill="#7c2d12" text-anchor="middle">puddle</text>
  <rect x="600" y="286" width="150" height="60" fill="#1f3d36" opacity="0.15"/>
  <text x="56" y="84" font-family="Helvetica" font-size="22" fill="#16211f">${escapeXml(caption)}</text>
  <text x="56" y="120" font-family="Helvetica" font-size="14" fill="#4b5750">Site inspection photo record (sample evidence generated for demo)</text>
  <text x="56" y="530" font-family="Helvetica" font-size="14" fill="#4b5750">Civic Casework Archive - generated placeholder</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

function escapeXml(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* -------------------------------------------------------------------------- */
/*  Seed content                                                               */
/* -------------------------------------------------------------------------- */

interface SeedAttachment {
  name: string;
  kind: "pdf" | "svg";
  title: string;
  lines: string[];
}

interface SeedEvent {
  dayOffset: number;
  hour: number;
  eventType: EventType;
  description: string;
  fullContent?: string;
  attachments?: SeedAttachment[];
}

interface SeedCase {
  govRefNumber: string | null;
  department: string;
  title: string;
  location: string;
  status: CaseStatus;
  actionRequiredBy: ActionRequiredBy;
  submissionOffset: number;
  expectedOffset: number | null;
  events: SeedEvent[];
}

const SEED_CASES: SeedCase[] = [
  {
    govRefNumber: "HY/TPO/2026/0412",
    department: "HyD",
    title: "尚德邨唐明街行人路上蓋長期積水及地磚破損",
    location: "將軍澳尚德邨唐明街（尚德商場對出巴士站）",
    status: "processing",
    actionRequiredBy: "gov",
    submissionOffset: -42,
    expectedOffset: -6,
    events: [
      {
        dayOffset: -42,
        hour: 10,
        eventType: "email_out",
        description:
          "去信路政署反映唐明街行人路上蓋長期積水，地磚鬆脫，要求安排維修及交代時間表。",
        fullContent:
          "路政署署長：\n\n本人為將軍澳尚德邨居民，現就唐明街近尚德商場對出巴士站之行人路上蓋，長期出現積水及地磚破損情況提出投訴。\n\n一、問題描述\n該段行人路上蓋每逢下雨後積水超過兩日仍未散去，地磚因長期浸水而鬆脫，行人被迫走出馬路邊緣。過去三個月本人已目擊至少兩名長者於該處滑倒。\n\n二、訴求\n1. 於十四個工作天內完成積水成因勘察，並改善排水坡度或加設去水口；\n2. 重鋪鬆脫地磚，並提供完工日期；\n3. 書面回覆上述跟進時間表。\n\n隨函附上現場照片三張及位置圖，敬請 貴署跟進。\n\n陳情代表 陳\n2026年",
        attachments: [
          {
            name: "陳情書_唐明街行人路上蓋.pdf",
            kind: "pdf",
            title: "Memorial - Tong Ming Street footpath canopy",
            lines: [
              "To: Highways Department",
              "Subject: Standing water and defective paving at Tong Ming Street",
              "Request: complete drainage survey within 14 working days;",
              "re-lay loose paving units and provide a works completion date.",
              "Attachments: 3 site photos and one location plan.",
            ],
          },
        ],
      },
      {
        dayOffset: -34,
        hour: 16,
        eventType: "email_in",
        description:
          "路政署以電郵回覆，個案編號 HY/TPO/2026/0412，已轉交九龍區維修組跟進。",
        fullContent:
          "陳先生：\n\n就你於較早前就唐明街行人路上蓋積水及地磚破損一事，本署個案編號為 HY/TPO/2026/0412。\n\n本署已將個案轉交九龍區保養組跟進，職員會於稍後時間到場視察。一般而言，本署會於收到投訴後 30 個工作天內完成初步調查並回覆投訴人。\n\n如欲查詢個案進度，請引述上述個案編號與本署聯絡。\n\n路政署 九龍區辦事處",
        attachments: [
          {
            name: "路政署回覆_HY-TPO-2026-0412.pdf",
            kind: "pdf",
            title: "Highways Department acknowledgement",
            lines: [
              "Our ref: HY/TPO/2026/0412",
              "Your complaint has been referred to the Kowloon maintenance team.",
              "A preliminary reply will normally be issued within 30 working days.",
            ],
          },
        ],
      },
      {
        dayOffset: -20,
        hour: 9,
        eventType: "site_visit",
        description:
          "早上實地巡查：積水範圍約 3 米乘 1.5 米，行人需走出行車線閃避，已拍照記錄。",
        fullContent:
          "巡查時間：上午 08:15\n天氣：多雲，前一日有雨\n\n觀察：\n1. 積水集中於巴士站候車亭對出，水深約 1 至 2 厘米，面積約 3m x 1.5m。\n2. 三塊地磚明顯鬆脫，輕踩有積水濺出。\n3. 15 分鐘內共有 11 名行人走落行車線邊緣閃避水窪，包括一名推輪椅長者。\n\n結論：情況與上次投訴一致，未見任何臨時維修或警告標示。",
        attachments: [
          {
            name: "現場照片_唐明街積水範圍.svg",
            kind: "svg",
            title: "Tong Ming Street site photo record",
            lines: [],
          },
        ],
      },
      {
        dayOffset: -6,
        hour: 21,
        eventType: "internal_note",
        description:
          "SLA 期限已過仍未有正式回覆，準備透過 1823 升級並要求交代維修時間表。",
        fullContent:
          "內部檢視：\n- 政府編號 HY/TPO/2026/0412 於去信後 34 日首次回覆，只屬確認收悉，未回應任何訴求。\n- 預計回覆期限已逾期 6 日。\n下一步：\n1. 以 1823 熱線建立升級個案，附上原有個案編號；\n2. 若 14 日內仍無具體時間表，考慮向申訴專員公署投訴延誤。",
      },
    ],
  },
  {
    govRefNumber: "FEHD/SE/KT/2026/8891",
    department: "FEHD",
    title: "尚禮樓對出違例棄置建築廢料及泥頭",
    location: "將軍澳尚德邨尚禮樓地下垃圾房側",
    status: "processing",
    actionRequiredBy: "gov",
    submissionOffset: -21,
    expectedOffset: 9,
    events: [
      {
        dayOffset: -21,
        hour: 11,
        eventType: "email_out",
        description:
          "同時向食環署及 1823 投訴違例棄置建築廢料，要求清理及加強巡查。",
        fullContent:
          "食物環境衞生署：\n\n尚德邨尚禮樓地下垃圾房側空地，過去三星期持續出現建築廢料及泥頭，堆積面積逐步擴大，阻塞通往垃圾房之通道，並引致鼠患。\n\n本人要求：\n1. 安排承辦商清理上述廢料；\n2. 於上址加設告示及監察攝錄機；\n3. 就違例棄置個案採取檢控行動並回覆數字。\n\n附上現場照片兩張。\n\n陳情代表 陳",
      },
      {
        dayOffset: -12,
        hour: 15,
        eventType: "email_in",
        description:
          "食環署回覆：已派員巡查並轉介房屋署清理，個案由屋邨管理處跟進。",
        fullContent:
          "陳先生：\n\n謝謝你於本署網站的投訴（個案編號 FEHD/SE/KT/2026/8891）。\n\n本署人員已於上周到上址巡查，發現有建築廢料堆放。由於該位置屬香港房屋委員會管理範圍，本署已將個案轉介房屋署跟進清理。本署會繼續留意上址衞生情況。\n\n食物環境衞生署 西貢區環境衞生辦事處",
      },
      {
        dayOffset: -3,
        hour: 8,
        eventType: "site_visit",
        description:
          "巡查發現廢料未清走，反而增加至約兩車泥頭，已拍攝記錄並準備追問。",
        fullContent:
          "巡查時間：上午 07:40\n\n現場情況：泥頭及碎石堆積範圍約 4m x 2m，較上次巡查增加約一倍；通道僅餘約 0.6m 寬。垃圾房門外有兩袋破損建築廢料，未見任何清理告示。\n\n拍照 4 張，建議要求食環署與房屋署聯合巡查並交代執法數字。",
        attachments: [
          {
            name: "現場照片_尚禮樓廢料堆.svg",
            kind: "svg",
            title: "Sheung Lai House fly-tipping record",
            lines: [],
          },
        ],
      },
    ],
  },
  {
    govRefNumber: "EPD/TPO/CONC/2026/117",
    department: "EPD",
    title: "將軍澳第 65 區擬建混凝土廠的粉塵與噪音風險",
    location: "將軍澳第 65 區（近環保大道）",
    status: "appealing",
    actionRequiredBy: "user",
    submissionOffset: -70,
    expectedOffset: -20,
    events: [
      {
        dayOffset: -70,
        hour: 14,
        eventType: "email_out",
        description:
          "提交陳情信及 312 名居民聯署，要求環保署就擬建混凝土廠公開環評資料並設監測點。",
        fullContent:
          "環境保護署署長：\n\n我們是一群將軍澳居民，現就第 65 區擬建混凝土廠提出強烈關注。\n\n一、理據\n1. 該廠選址距離最近住宅群不足 250 米；\n2. 居民關注混凝土攪拌產生之懸浮粒子（PM10／PM2.5）及夜間裝卸噪音；\n3. 現時區內已承載大量工程車輛，環保大道早上繁忙時段車龍已達 1.2 公里。\n\n二、訴求\n1. 公開完整環評報告及空氣質素模擬結果；\n2. 於尚德邨及將軍澳中心加設實時空氣及噪音監測點；\n3. 要求發展商提交車輛流量管理計劃，並召開居民諮詢會。\n\n隨函附上 312 名居民聯署及區內空氣監測紀錄。\n\n將軍澳居民關注組",
        attachments: [
          {
            name: "陳情信_第65區混凝土廠聯署.pdf",
            kind: "pdf",
            title: "Petition - Concrete batching plant at TKO Area 65",
            lines: [
              "To: Environmental Protection Department",
              "Signed by 312 residents of Tseung Kwan O.",
              "Requests: full EIA disclosure, real-time monitoring, public consultation.",
            ],
          },
        ],
      },
      {
        dayOffset: -55,
        hour: 17,
        eventType: "email_in",
        description:
          "環保署回覆：已派員巡查，未發現違規排放，環評資料已上載網站。",
        fullContent:
          "敬啟者：\n\n就你等關注第 65 區混凝土廠事宜（檔案編號 EPD/TPO/CONC/2026/117），本署回覆如下：\n\n本署人員已於本月到擬建選址視察，未發現現行違規排放。有關環評程序將按《環境影響評估條例》辦理，相關資料稍後會上載至環評條例網站。\n\n本署會繼續按法定程序處理有關申請。\n\n環境保護署",
      },
      {
        dayOffset: -40,
        hour: 22,
        eventType: "site_visit",
        description:
          "晚間實地巡查：連續三晚記錄到泥頭車進出及明顯粉塵，拍攝影片截圖存檔。",
        fullContent:
          "巡查日期：連續三晚（21:30–23:00）\n\n紀錄：\n1. 每晚平均 14 架次重型泥頭車進出環保大道臨時通道；\n2. 車燈照射下可見明顯粉塵飄散至行人路方向；\n3. 接近民居一側圍板高度不足，未見灑水措施。\n\n已拍攝照片 6 張及影片 2 段（可另行提供）。",
        attachments: [
          {
            name: "現場照片_夜間粉塵.svg",
            kind: "svg",
            title: "Night dust monitoring record",
            lines: [],
          },
        ],
      },
      {
        dayOffset: -25,
        hour: 10,
        eventType: "email_out",
        description:
          "去信追問，要求提供巡查日期、人員紀錄及環評空氣模擬結果，並要求召開居民諮詢會。",
        fullContent:
          "環境保護署：\n\n就有關回覆，本組未能接受。請於 14 日內提供：\n1. 貴署巡查之日期、時間及人員紀錄；\n2. 環評報告內空氣質素模擬結果與居民區距離之假設；\n3. 曾否就上址非法工程發出任何通知書或檢控；\n4. 居民諮詢會之安排。\n\n若限期前未獲實質回覆，我們將向申訴專員公署投訴貴署處理失當。\n\n將軍澳居民關注組",
        attachments: [
          {
            name: "追問信_環評資料要求.pdf",
            kind: "pdf",
            title: "Follow-up letter - EIA information request",
            lines: [
              "Requests: inspection log, air quality modelling assumptions,",
              "enforcement records and resident consultation arrangements.",
            ],
          },
        ],
      },
      {
        dayOffset: -4,
        hour: 20,
        eventType: "internal_note",
        description:
          "政府逾期 20 日未回覆實質資料，整理時間軸準備向申訴專員公署提出投訴。",
        fullContent:
          "狀態：環保署自 -55 日之回覆後未有回覆我們 -25 日的追問，已逾期 20 日。\n\n準備文件：\n- 時間軸（10 個節點）\n- 聯署正本\n- 夜間巡查照片及影片\n\n申訴專員投訴重點：部門未有回應具體資料要求，亦未交代監測安排。",
      },
    ],
  },
  {
    govRefNumber: "TD/KE/BR/2026/2044",
    department: "TD",
    title: "康城站公共運輸交匯處巴士排隊安排混亂",
    location: "將軍澳康城站公共運輸交匯處",
    status: "replied_pending_user",
    actionRequiredBy: "user",
    submissionOffset: -18,
    expectedOffset: 3,
    events: [
      {
        dayOffset: -18,
        hour: 9,
        eventType: "email_out",
        description:
          "去信運輸署反映繁忙時間排隊欄杆不足、乘客插隊及人車爭路，要求與巴士公司檢視候車安排。",
        fullContent:
          "運輸署署長：\n\n康城站公共運輸交匯處早上 07:30–09:00 排隊情況長期混亂，欄杆只覆蓋首 20 米，其餘候車乘客站出車道，人車爭路情況嚴重。\n\n建議：\n1. 延長排隊欄杆至全個月台；\n2. 增設地面候車指示及職員疏导；\n3. 與巴士營辦商檢視繁忙時間班次。\n\n陳情代表 陳",
      },
      {
        dayOffset: -9,
        hour: 16,
        eventType: "email_in",
        description:
          "運輸署回覆：已要求巴士營辦商於繁忙時間安排職員維持秩序，並會檢視欄杆位置。",
        fullContent:
          "陳先生：\n\n謝謝你就康城站公共運輸交匯處候車安排的意見（個案編號 TD/KE/BR/2026/2044）。\n\n本署已要求巴士營辦商於平日早上繁忙時段安排職員在場維持秩序，並會聯同相關部門檢視排隊欄杆之位置及長度。\n\n運輸署 九龍區運輸管理部",
      },
      {
        dayOffset: -2,
        hour: 21,
        eventType: "internal_note",
        description:
          "需回覆確認改善時間表，並要求提供欄杆檢視結果及現場職員安排之生效日期。",
        fullContent:
          "待辦：\n1. 去信要求運輸署提供欄杆檢視結果及完工日期；\n2. 詢問營辦商職員維持秩序之具體時段及人數；\n3. 兩星期後再到場巡查核實。\n\n備註：政府回覆只屬原則性承諾，未有時間表。",
      },
    ],
  },
  {
    govRefNumber: "1823-2026-0311-77",
    department: "1823",
    title: "寶琳北路單車徑路面破損及雜物堆積",
    location: "將軍澳寶琳北路近景林邨單車徑",
    status: "processing",
    actionRequiredBy: "gov",
    submissionOffset: -10,
    expectedOffset: 21,
    events: [
      {
        dayOffset: -10,
        hour: 8,
        eventType: "email_out",
        description:
          "經 1823 提交投訴，指單車徑路面下陷及雜物堆積，要求轉介相關部門並回覆。",
        fullContent:
          "1823：\n\n寶琳北路近景林邨一段單車徑，路面出現約 1 米長下陷裂縫，旁邊堆積枯枝及建築雜物，單車使用者需突然閃避。\n\n請轉介相關部門維修及清理，並提供部門回覆及個案編號。\n\n市民 陳",
        attachments: [
          {
            name: "1823投訴副本.pdf",
            kind: "pdf",
            title: "1823 complaint copy",
            lines: [
              "Channel: 1823 online form",
              "Subject: Damaged cycle track and debris at Po Lam Road North",
              "Requested action: repair and clearance.",
            ],
          },
        ],
      },
      {
        dayOffset: -3,
        hour: 12,
        eventType: "email_in",
        description:
          "1823 回覆已把個案轉介路政署（個案編號 1823-2026-0311-77），預計 10 個工作天內有初步回覆。",
        fullContent:
          "陳先生：\n\n你於本年 3 月提交的投訴（個案編號 1823-2026-0311-77）已轉介路政署跟進。該署會直接與你聯絡，並會於 10 個工作天內向你發出初步回覆。\n\n如個案未能在合理時間內獲得處理，歡迎再次與 1823 聯絡。\n\n1823 客戶服務主任",
      },
    ],
  },
  {
    govRefNumber: "HADC/SK/2025/6612",
    department: "DO",
    title: "尚德商場對出欄杆阻擋輪椅使用者通過",
    location: "將軍澳尚德邨尚德商場對出無障礙通道",
    status: "closed",
    actionRequiredBy: "none",
    submissionOffset: -120,
    expectedOffset: -30,
    events: [
      {
        dayOffset: -120,
        hour: 10,
        eventType: "email_out",
        description:
          "去信西貢民政事務處，反映新設欄杆令無障礙通道淨闊不足，要求拆除或改建。",
        fullContent:
          "西貢民政事務處：\n\n尚德商場對出近日新設金屬欄杆，令通往商場之無障礙通道淨闊由約 1.5 米收窄至約 0.9 米，輪椅及手推車使用者難以通過。\n\n請與相關部門檢視有關設計，並按《殘疾人及長者設計手冊》要求改善。\n\n陳情代表 陳",
      },
      {
        dayOffset: -95,
        hour: 15,
        eventType: "email_in",
        description: "民政事務處回覆：已轉介房屋署與商場管理處跟進。",
        fullContent:
          "陳先生：\n\n就尚德商場對出欄杆事宜，本處已將個案轉介香港房屋委員會及商場管理處跟進，個案編號 HADC/SK/2025/6612。\n\n如有進一步消息，本處會再作通知。\n\n西貢民政事務處",
      },
      {
        dayOffset: -80,
        hour: 9,
        eventType: "site_visit",
        description:
          "實地巡查並量度：無障礙通道淨闊只有 0.88 米，輪椅需斜向切入方能通過。",
        fullContent:
          "量度紀錄：\n- 欄杆之間淨闊：0.88 米；\n- 通道全寬：1.52 米；\n- 10 分鐘內有 2 名輪椅使用者及 3 部手推車需他人協助通過。\n\n現場照片及量度紀錄已存檔。",
        attachments: [
          {
            name: "現場照片_無障礙通道.svg",
            kind: "svg",
            title: "Accessibility clearance measurement",
            lines: [],
          },
        ],
      },
      {
        dayOffset: -70,
        hour: 11,
        eventType: "email_in",
        description:
          "房委會回覆：已安排承辦商改建欄杆，預計四星期內完工。",
        fullContent:
          "陳先生：\n\n有關尚德商場對出無障礙通道欄杆事宜，本署已安排承辦商將欄杆改建為單邊扶手，並重鋪地面以確保淨闊不少於 1.5 米。工程預計於四星期內完成。\n\n香港房屋委員會",
      },
      {
        dayOffset: -60,
        hour: 18,
        eventType: "internal_note",
        description:
          "再到場確認欄杆已改建，通道淨闊約 1.6 米，個案正式結案並備份所有文件。",
        fullContent:
          "驗收紀錄：欄杆已改為單邊扶手，地面重鋪，實測淨闊約 1.6 米，輪椅使用者可直線通過。\n\n結論：訴求全部達成，個案結案。所有往來文件已上載至時間軸附件，日後如情況再現可直接引用此個案。",
      },
    ],
  },
  {
    govRefNumber: "FEHD/SE/KT/2026/9024",
    department: "FEHD",
    title: "景林邨景松樓地下垃圾房鼠患持續",
    location: "將軍澳景林邨景松樓地下垃圾房",
    status: "replied_pending_user",
    actionRequiredBy: "user",
    submissionOffset: -30,
    expectedOffset: 2,
    events: [
      {
        dayOffset: -30,
        hour: 8,
        eventType: "email_out",
        description:
          "去信食環署投訴垃圾房鼠患及垃圾滿溢，要求加強滅鼠及調整收集時間。",
        fullContent:
          "食物環境衞生署：\n\n景林邨景松樓地下垃圾房每晚約 21:00 後垃圾滿溢，垃圾袋堆放於垃圾房外，凌晨時分可見老鼠出沒。\n\n要求：\n1. 加密垃圾收集次數；\n2. 於垃圾房及周邊進行密集滅鼠；\n3. 檢視垃圾房門隙及排水位置，堵塞老鼠通道。\n\n景林邨居民 陳",
      },
      {
        dayOffset: -22,
        hour: 16,
        eventType: "email_in",
        description:
          "食環署回覆：已於上址進行滅鼠及防鼠工作，並會加強巡查。",
        fullContent:
          "陳先生：\n\n關於景林邨景松樓地下垃圾房鼠患（個案編號 FEHD/SE/KT/2026/9024），本署已派員到場進行滅鼠及防鼠工作，包括放置毒餌及堵塞老鼠洞。本署會繼續留意上址情況。\n\n食物環境衞生署 西貢區環境衞生辦事處",
      },
      {
        dayOffset: -10,
        hour: 22,
        eventType: "internal_note",
        description:
          "住戶反映仍有鼠蹤，已收集 3 張夜間照片，準備追問滅鼠紀錄及垃圾收集時間表。",
        fullContent:
          "待辦：\n1. 整理夜間照片（3 張）及住戶陳述；\n2. 要求食環署提供滅鼠次數、毒餌位置及巡查紀錄；\n3. 要求房署檢視垃圾收集時間及垃圾房門隙維修。\n\n風險：若情況持續，可要求區議員陪同實地視察並要求跨部門會議。",
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Runtime seeding                                                            */
/* -------------------------------------------------------------------------- */

function buildAttachment(attachment: SeedAttachment): StoredAttachment {
  const data =
    attachment.kind === "pdf"
      ? buildSamplePdf(attachment.title, attachment.lines)
      : buildFieldNoteSvg(attachment.title);
  return {
    name: attachment.name,
    mimeType:
      attachment.kind === "pdf" ? "application/pdf" : "image/svg+xml",
    sizeBytes: data.length,
    data: data.toString("base64"),
  };
}

async function runSeed(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(4629013)`);
    const [existing] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(cases);
    if ((existing?.count ?? 0) > 0) return;

    for (const seed of SEED_CASES) {
      const [createdCase] = await tx
        .insert(cases)
        .values({
          govRefNumber: seed.govRefNumber,
          department: seed.department,
          title: seed.title,
          location: seed.location,
          status: seed.status,
          actionRequiredBy: seed.actionRequiredBy,
          submissionDate: shiftYmd(seed.submissionOffset),
          expectedReplyDate:
            seed.expectedOffset === null ? null : shiftYmd(seed.expectedOffset),
        })
        .returning({ id: cases.id });

      for (const event of seed.events) {
        await tx.insert(timelineEvents).values({
          caseId: createdCase.id,
          eventDate: isoAt(event.dayOffset, event.hour),
          eventType: event.eventType,
          description: event.description,
          fullContent: event.fullContent ?? null,
          attachmentsBase64: (event.attachments ?? []).map(buildAttachment),
        });
      }
    }
  });
}

let seedPromise: Promise<void> | null = null;

/**
 * Demo data bootstrap. Enabled by default so the sandbox preview is never
 * empty; set SEED_DEMO_DATA=false in production to start with a clean archive
 * (and to avoid writing sample rows on the first /api/health probe).
 */
export function ensureSeeded(): Promise<void> {
  if (process.env.SEED_DEMO_DATA === "false") {
    return Promise.resolve();
  }
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      console.error("[seed] failed to bootstrap sample cases", error);
    });
  }
  return seedPromise;
}
