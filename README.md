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

# 2. 安裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env，填入你的 API keys

# 4. 執行
npm run dev
```

## 環境變數

| 變數 | 說明 | 取得方式 |
|------|------|----------|
| `SERPAPI_KEY` | SerpApi API Key（必填） | [serpapi.com](https://serpapi.com) 註冊取得 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API Token（選填） | [LINE Developers Console](https://developers.line.biz) 建立 Bot 取得 |

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
npm run build   # 編譯 TypeScript → dist/
npm run start   # 執行編譯後的程式
npm run dev     # 直接執行 TypeScript（開發用）
npm test        # 執行測試
```

## GitHub Actions 排程

已設定 `.github/workflows/cron.yml`，每日自動執行三次。

需在 GitHub repo 的 **Settings → Secrets and variables → Actions** 新增：
- `SERPAPI_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`

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
    ├── date.ts               # 日期工具
    └── tfs-gen.ts            # Google Flights URL 編碼（⚠️ 逆向工程）
```

## Tech Stack

- **Runtime**: Node.js + TypeScript (ESM)
- **Flight Data**: SerpApi (Google Flights engine)
- **Notifications**: LINE Messaging API (Broadcast + Flex Message)
- **Scheduling**: GitHub Actions cron
- **Testing**: Vitest
