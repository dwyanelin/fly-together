# ✈️ fly-together

定期搜尋符合條件的機票，透過 LINE 推播卡片通知，附上 Google Flights 訂票連結。

## 功能

- **在 LINE 裡直接設定追蹤航線**：點聊天室底部圖文選單 → 開表單選機場/日期/價格門檻
- 自動搜尋設定的航線（透過 [SerpApi](https://serpapi.com) Google Flights 引擎）
- 僅篩選直飛 + 指定航空公司（傳統航空：華航/長榮/星宇/日航/全日空）
- 價格低於設定門檻時，透過 LINE Flex Message 推播通知（broadcast 給所有好友）
- 通知卡片包含航空公司、出發時間、價格，一鍵連結至 Google Flights
- Google Apps Script 自動排程觸發 GitHub Actions（每日四次：台灣時間 08:00 / 12:00 / 17:00 / 22:00，不受 GitHub 60 天無 commit 停用限制）
- 全域共用 2 個路線名額（新設定覆蓋最舊）：2 條 × 4 次/天 × 31 天 = 248 次/月，控制在 SerpApi 免費額度 250 內

## 系統架構

```
使用者 LINE 聊天室
  └─ 圖文選單「✈️ 設定航班追蹤」→ 開啟表單（LINE 內建瀏覽器）
       └─ Google Apps Script Web App
            ├─ doGet                → 表單頁（apps-script/form.html）
            ├─ submitRoute          → 驗證後寫入 Google Sheet（上限 2 格，覆蓋最舊）
            ├─ doGet?action=list    → routes JSON
            └─ triggerFlightMonitor → 每日 4 次呼叫 GitHub workflow_dispatch
                 │                      ▲
                 ▼                      │
GitHub Actions（workflow_dispatch）─────┘
  └─ 讀 routes JSON → SerpApi 搜尋 → 達標 → LINE broadcast 通知
```

## 快速開始

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/fly-together.git
cd fly-together

# 2. 安裝依賴（使用 pnpm）
pnpm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env，填入你的 API keys

# 4. 執行
pnpm dev
```

> 本專案使用 **pnpm** 作為套件管理工具。若尚未安裝：`npm install -g pnpm` 或 `corepack enable pnpm`。

## 環境變數

| 變數 | 說明 | 取得方式 |
|------|------|----------|
| `SERPAPI_KEY` | SerpApi API Key（必填） | [serpapi.com](https://serpapi.com) 註冊取得 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API Token（選填） | [LINE Developers Console](https://developers.line.biz) 建立 Bot 取得 |
| `LINE_USER_ID` | 測試用：只推播給你個人帳號（選填） | 見下方「[測試：只通知自己](#測試只通知自己)」 |
| `ROUTES_API_URL` | Apps Script Web App 的 `/exec` JSON API URL（選填） | 見下方「[透過 LINE 設定航線](#透過-line-設定航線一次性部署)」；未設定時改讀本地 `config/routes.json` |
| `FORM_URL` | LINE 圖文選單開啟的前端表單頁 URL（選填） | 預設為 GitHub Pages（`https://dwyanelin.github.io/fly-together/`），僅 `pnpm setup:richmenu` 使用 |

## 測試：只通知自己

預設情況下，通知會以 **broadcast** 發送給此 LINE 官方帳號的「所有好友」。測試時若只想推播到你個人的 LINE，設定 `LINE_USER_ID` 即可——程式會自動改用 **push** API，只發給該使用者。

```bash
# .env
LINE_USER_ID=U1234567890abcdef...   # 你的 LINE userId（U 開頭）
```

**行為切換：**

| `LINE_USER_ID` | 發送方式 | 對象 |
|----------------|----------|------|
| 有設定 | push | 只有你自己 |
| 留空 / 未設定 | broadcast | 官方帳號所有好友 |

**如何取得你的 `userId`：**

1. 用你個人 LINE 加此官方帳號為好友（掃 LINE Developers Console → Messaging API 頁的 QR code）。
2. 取得 userId（U 開頭的字串，**不是** LINE ID）：
   - **最快**：LINE Developers Console → 你的 channel → **Basic settings** → **Your user ID**。
   - 或設定 webhook，從加好友 / 傳訊事件的 `source.userId` 取得。

> 正式上線要廣播給所有好友時，把 `LINE_USER_ID` 拿掉或留空即可，無需改程式。

## 透過 LINE 設定航線（一次性部署）

日常設定完全在 LINE 裡完成；以下部署步驟只需做一次。

### Step 1 — 部署 Google Apps Script

1. 到 [script.google.com](https://script.google.com) → 新增專案，命名如 `fly-together-routes`。
2. 把 `apps-script/Code.gs` 的內容貼進 `Code.gs`。
3. 新增 HTML 檔案命名為 `form`，貼上 `apps-script/form.html` 的內容。
4. 部署 → 新增部署作業 → 類型「網頁應用程式」→ 執行身分「我」、存取權「**任何人**」→ 部署。
5. 複製產生的 **Web App URL**（`https://script.google.com/macros/s/.../exec`）。
   - 首次使用會自動建立名為「fly-together-routes」的 Google Sheet 存放路線資料。

### Step 2 — 填入 URL

```bash
# .env（本機）
ROUTES_API_URL=https://script.google.com/macros/s/XXXX/exec   # 後端 JSON API（Apps Script /exec）
FORM_URL=https://dwyanelin.github.io/fly-together/            # 前端設定頁（GitHub Pages，給圖文選單用）

# GitHub repo → Settings → Secrets and variables → Actions
# 新增 secret：ROUTES_API_URL（填 Apps Script /exec，與本機一致）
```

### Step 3 — 建立 LINE 圖文選單

```bash
pnpm setup:richmenu
```

會自動：刪除舊選單 → 建立「✈️ 設定航班追蹤」選單 → 上傳 `assets/richmenu.png` → 設為所有好友的預設選單。之後好友在聊天室底部點選單即可開表單設定。

### 使用者可設定的欄位

| 欄位 | 限制 |
|------|------|
| 出發機場 | 僅 `TPE`（桃園）/ `TSA`（松山） |
| 抵達機場 | 任意 3 碼 IATA 代碼（表單附常用清單） |
| 出發 / 回程日期 | 回程需晚於出發，出發不可為過去 |
| 價格門檻 | 正整數（TWD），來回含稅低於此價才通知 |

幣別固定 TWD、航空公司固定傳統航空、通知卡片的目的地名稱由代碼自動推導（`src/utils/airports.ts`）。

### 本地 fallback：`config/routes.json`

未設定 `ROUTES_API_URL` 時（本機開發），改讀 `config/routes.json`：

```json
{
  "routes": [
    {
      "outboundDate": "2026-10-24",
      "returnDate": "2026-11-01",
      "departure_id": "TPE",
      "arrival_id": "NRT",
      "maxPrice": 13000
    }
  ]
}
```

## Scripts

```bash
pnpm build           # 編譯 TypeScript → dist/
pnpm start           # 執行編譯後的程式
pnpm dev             # 直接執行 TypeScript（開發用）
pnpm test            # 執行測試
pnpm setup:richmenu  # 建立/重建 LINE 圖文選單（一次性）
```

## 自動排程（Apps Script → GitHub Actions）

為避免 GitHub 公開 repo 連續 60 天無 commit 自動停用 `on: schedule` 排程，改由 **Google Apps Script 時間驅動觸發條件** 每日四次（台灣時間 08:00 / 12:00 / 17:00 / 22:00）呼叫 GitHub API 觸發 `.github/workflows/cron.yml` 的 `workflow_dispatch`。

**GitHub Secrets**（**Settings → Secrets and variables → Actions**）：
- `SERPAPI_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `ROUTES_API_URL`（Apps Script 部署後的 /exec URL）
- `LINE_USER_ID`（選填，設定後 CI 也只推播給你個人帳號）

**Apps Script 排程設定（一次性）**：
1. 到 GitHub 建立 Fine-grained Personal Access Token（僅授權 `fly-together` repo，權限開 **Actions: Read and write**）。
2. 在 Apps Script 編輯器 → **專案設定 → 指令碼屬性**，新增 `GITHUB_TOKEN` 並貼上 Token。
3. 在 Apps Script 編輯器執行一次 `setupMonitorTriggers`（會自動建立每日 4 組台灣時間排程，重複執行也會先清舊的避免爆額度）。
4. 可執行一次 `triggerFlightMonitor` 驗證是否成功觸發 GitHub Actions。

也可隨時透過 **Actions → Flight Price Monitor → Run workflow** 手動觸發。

## CI / CD 自動化

| Workflow | 觸發時機 | 執行內容 |
|----------|----------|----------|
| `.github/workflows/ci.yml` | PR 至 `main`、push 至 `main` | 執行 `pnpm typecheck`、`pnpm test:coverage`、`pnpm build` |
| `.github/workflows/pages.yml` | 變更 `docs/**` 並合入 `main`（或手動觸發） | 自動部署前端設定頁至 GitHub Pages |
| `.github/workflows/richmenu.yml` | 變更 `assets/richmenu.png` 或 `scripts/setup-richmenu.ts` 並合入 `main`（或手動觸發） | 自動執行 `pnpm setup:richmenu` 更新 LINE 圖文選單（使用現有 `LINE_CHANNEL_ACCESS_TOKEN` Secret；若需自訂連結可另設 Repository Variable `FORM_URL`） |

> `apps-script/` 維持於 [script.google.com](https://script.google.com) 手動更新部署，以避免個人 Google 帳號 OAuth token 過期維護成本。

## 架構

```
src/
├── config.ts                 # 載入設定：ROUTES_API_URL（共用表）或 config/routes.json（fallback）
├── main.ts                   # 主流程：搜尋 → 篩選 → 組裝通知 → 發送
├── types.ts                  # TypeScript 型別定義
├── services/
│   ├── serpapi.ts            # SerpApi 航班搜尋（含 retry）
│   ├── linemessaging.ts      # LINE Messaging API 發送
│   └── flex-builder.ts       # LINE Flex Message 卡片組裝
└── utils/
    ├── airports.ts           # IATA 代碼 → 顯示名稱對照
    └── tfs-gen.ts            # Google Flights URL 編碼（⚠️ 逆向工程）
apps-script/
├── Code.gs                   # Apps Script 後端：表單頁 / 寫入 Sheet / routes JSON API / 排程觸發 GitHub Actions
└── form.html                 # LINE 內開啟的設定表單
scripts/
└── setup-richmenu.ts         # 建立 LINE 圖文選單（一次性）
assets/
└── richmenu.png              # 圖文選單圖片（2500×843）
```

## Tech Stack

- **Runtime**: Node.js + TypeScript (ESM)
- **Package Manager**: pnpm
- **Routes 設定**: LINE Rich Menu → Google Apps Script 表單 → Google Sheet
- **Flight Data**: SerpApi (Google Flights engine)
- **Notifications**: LINE Messaging API (Broadcast / Push + Flex Message)
- **Scheduling**: Google Apps Script Time-driven Triggers → GitHub Actions (`workflow_dispatch`)
- **Testing**: Vitest
