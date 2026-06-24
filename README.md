# ✈️ FlyTogether

定期搜尋符合條件的機票，透過 LINE 推播卡片通知，附上 Google Flights 訂票連結。

## 功能

- 自動搜尋多條航線（透過 [SerpApi](https://serpapi.com) Google Flights 引擎）
- 僅篩選直飛 + 指定航空公司（傳統航空）
- 價格低於設定門檻時，透過 LINE Flex Message 推播通知
- 通知卡片包含航空公司、出發時間、價格，一鍵連結至 Google Flights
- GitHub Actions 自動排程（每日三次：台灣時間 08:00 / 15:00 / 22:00）

## 快速開始

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/FlyTogether.git
cd FlyTogether

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

## 設定航線

編輯 `config/routes.json`：

```json
{
  "outboundDate": "2026-10-24",
  "returnDate": "2026-11-01",
  "currency": "TWD",
  "targets": [
    {
      "name": "東京(成田)",
      "departure_id": "TPE",
      "arrival_id": "NRT",
      "maxPrice": 13000,
      "airlinePreset": "traditional"
    }
  ]
}
```

| 欄位 | 說明 |
|------|------|
| `outboundDate` | 出發日期（YYYY-MM-DD） |
| `returnDate` | 回程日期（YYYY-MM-DD） |
| `currency` | 幣別（TWD / USD / JPY 等） |
| `name` | 目的地顯示名稱 |
| `departure_id` | 出發機場 IATA 代碼 |
| `arrival_id` | 抵達機場 IATA 代碼 |
| `maxPrice` | 價格門檻（超過此價不通知） |
| `airlinePreset` | 航空公司篩選（目前僅支援 `traditional`：華航/長榮/星宇/日航/全日空） |

## Scripts

```bash
pnpm build   # 編譯 TypeScript → dist/
pnpm start   # 執行編譯後的程式
pnpm dev     # 直接執行 TypeScript（開發用）
pnpm test    # 執行測試
```

## GitHub Actions 排程

已設定 `.github/workflows/cron.yml`，每日自動執行三次。

需在 GitHub repo 的 **Settings → Secrets and variables → Actions** 新增：
- `SERPAPI_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_USER_ID`（選填，設定後 CI 也只推播給你個人帳號）

也可透過 **Actions → Flight Price Monitor → Run workflow** 手動觸發。

## 架構

```
src/
├── config.ts                 # 讀取 config/routes.json + 環境變數
├── main.ts                   # 主流程：搜尋 → 篩選 → 組裝通知 → 發送
├── types.ts                  # TypeScript 型別定義
├── services/
│   ├── serpapi.ts            # SerpApi 航班搜尋（含 retry）
│   ├── linemessaging.ts      # LINE Messaging API 發送
│   └── flex-builder.ts       # LINE Flex Message 卡片組裝
└── utils/
    └── tfs-gen.ts            # Google Flights URL 編碼（⚠️ 逆向工程）
```

## Tech Stack

- **Runtime**: Node.js + TypeScript (ESM)
- **Package Manager**: pnpm
- **Flight Data**: SerpApi (Google Flights engine)
- **Notifications**: LINE Messaging API (Broadcast / Push + Flex Message)
- **Scheduling**: GitHub Actions cron
- **Testing**: Vitest
