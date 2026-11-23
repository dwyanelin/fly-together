/**
 * 建立並綁定 LINE 官方帳號的預設圖文選單（Rich Menu）。
 * 選單只有一個按鈕：開啟航班追蹤設定表單（FORM_URL）。
 *
 * 前置需求（.env）：
 *   LINE_CHANNEL_ACCESS_TOKEN — Messaging API channel access token
 *   FORM_URL                  — 航班追蹤設定頁 URL（選填，預設為 GitHub Pages 網址）
 *
 * 執行：pnpm setup:richmenu
 * 可重複執行：會先刪除同名舊選單再重建。
 */
import * as dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API = 'https://api.line.me/v2/bot';
const DATA_API = 'https://api-data.line.me/v2/bot';
const MENU_NAME = 'fly-together-settings';
// 舊版選單名稱，重跑時一併清除
const LEGACY_MENU_NAMES = ['flytogether-settings'];

const DEFAULT_FORM_URL = 'https://dwyanelin.github.io/fly-together/';

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const formUrl = process.env.FORM_URL || DEFAULT_FORM_URL;

if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set in .env');

const headers = { Authorization: `Bearer ${token}` };

async function main() {
  // 1. 刪除舊的同名選單（idempotent）
  const { data: existing } = await axios.get(`${API}/richmenu/list`, { headers });
  for (const menu of existing.richmenus ?? []) {
    if (menu.name === MENU_NAME || LEGACY_MENU_NAMES.includes(menu.name)) {
      await axios.delete(`${API}/richmenu/${menu.richMenuId}`, { headers });
      console.log(`Deleted old rich menu ${menu.richMenuId} (${menu.name})`);
    }
  }

  // 2. 建立選單（單一全幅按鈕 → 開啟設定表單）
  const { data: created } = await axios.post(
    `${API}/richmenu`,
    {
      size: { width: 2500, height: 843 },
      selected: true,
      name: MENU_NAME,
      chatBarText: '✈️ 設定航班追蹤',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 2500, height: 843 },
          action: { type: 'uri', label: '開啟設定表單', uri: formUrl }
        }
      ]
    },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  const richMenuId = created.richMenuId;
  console.log(`Created rich menu ${richMenuId}`);

  // 3. 上傳選單圖片
  const image = readFileSync(resolve(__dirname, '..', 'assets', 'richmenu.png'));
  await axios.post(`${DATA_API}/richmenu/${richMenuId}/content`, image, {
    headers: { ...headers, 'Content-Type': 'image/png' }
  });
  console.log('Uploaded rich menu image');

  // 4. 設為所有好友的預設選單
  await axios.post(`${API}/user/all/richmenu/${richMenuId}`, null, { headers });
  console.log('Set as default rich menu for all users. Done ✅');
}

main().catch(err => {
  const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
  console.error(`Rich menu setup failed: ${detail}`);
  process.exit(1);
});
