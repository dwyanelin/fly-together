/**
 * fly-together — LINE 航班追蹤設定後端（Google Apps Script）
 *
 * 部署方式見專案 README「透過 LINE 設定航線」一節。
 * 職責：
 *   1. doGet()                → 回傳設定表單頁（由 LINE 圖文選單開啟）
 *   2. doGet(?action=list)    → 回傳 routes JSON（給 GitHub Actions cron 讀取）
 *   3. submitRoute(data)      → 表單送出：驗證後寫入 Google Sheet（上限 2 格，覆蓋最舊）
 *
 * 資料存放：自動建立的 Google Sheet（試算表 ID 記在 Script Properties，
 * 也可在 Apps Script 編輯器的「專案設定 → 指令碼屬性」看到 SHEET_ID）。
 */

var MAX_ROUTES = 2; // 全域路線上限：2 條 × 每天 4 次 cron × 31 天 = 248 次/月 < SerpApi 免費額度 250
var ALLOWED_DEPARTURES = ['TPE', 'TSA'];
var HEADERS = ['outboundDate', 'returnDate', 'departure_id', 'arrival_id', 'maxPrice', 'updatedAt'];

// ---------- Web entrypoints ----------

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'list') {
    return ContentService
      .createTextOutput(JSON.stringify({ routes: getRoutes() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutputFromFile('form')
    .setTitle('FlyTogether 航班追蹤設定')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- Called from form.html via google.script.run ----------

function getRoutes() {
  var sheet = getOrCreateSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues().map(function (row) {
    return {
      outboundDate: toDateString_(row[0]),
      returnDate: toDateString_(row[1]),
      departure_id: String(row[2]),
      arrival_id: String(row[3]),
      maxPrice: Number(row[4]),
      updatedAt: row[5] ? new Date(row[5]).toISOString() : ''
    };
  });
}

function submitRoute(data) {
  var error = validate_(data);
  if (error) return { ok: false, message: error };

  // 同時送出時避免交錯寫入
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getOrCreateSheet_();
    var newRow = [
      data.outboundDate,
      data.returnDate,
      data.departure_id,
      data.arrival_id,
      Number(data.maxPrice),
      new Date().toISOString()
    ];

    var lastRow = sheet.getLastRow();
    var dataRowCount = Math.max(0, lastRow - 1);

    if (dataRowCount < MAX_ROUTES) {
      sheet.appendRow(newRow);
    } else {
      // 已滿：覆蓋 updatedAt 最舊的那一列
      var rows = sheet.getRange(2, 1, dataRowCount, HEADERS.length).getValues();
      var oldestIndex = 0;
      for (var i = 1; i < rows.length; i++) {
        if (new Date(rows[i][5]) < new Date(rows[oldestIndex][5])) oldestIndex = i;
      }
      sheet.getRange(2 + oldestIndex, 1, 1, HEADERS.length).setValues([newRow]);
    }

    return { ok: true, message: '設定完成！低於門檻價時會透過 LINE 通知。', routes: getRoutes() };
  } finally {
    lock.releaseLock();
  }
}

// ---------- Internals ----------

function validate_(data) {
  if (!data) return '缺少資料';

  var dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(data.outboundDate || '') || !dateRe.test(data.returnDate || '')) {
    return '日期格式錯誤（YYYY-MM-DD）';
  }

  var outbound = new Date(data.outboundDate);
  var ret = new Date(data.returnDate);
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(outbound.getTime()) || isNaN(ret.getTime())) return '日期無效';
  if (outbound < today) return '出發日期不能是過去';
  if (ret <= outbound) return '回程日期必須晚於出發日期';

  if (ALLOWED_DEPARTURES.indexOf(data.departure_id) === -1) {
    return '出發機場僅限 TPE（桃園）或 TSA（松山）';
  }

  var arrival = String(data.arrival_id || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(arrival)) return '抵達機場需為 3 碼 IATA 代碼（如 NRT）';
  if (arrival === data.departure_id) return '抵達機場不能與出發機場相同';
  data.arrival_id = arrival;

  var price = Number(data.maxPrice);
  if (!isFinite(price) || price <= 0 || price !== Math.floor(price) || price > 1000000) {
    return '價格門檻需為正整數（TWD）';
  }

  return null;
}

function getOrCreateSheet_() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('SHEET_ID');
  var spreadsheet;

  if (sheetId) {
    spreadsheet = SpreadsheetApp.openById(sheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('fly-together-routes');
    props.setProperty('SHEET_ID', spreadsheet.getId());
  }

  var sheet = spreadsheet.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Sheet 可能把日期字串轉成 Date 物件，讀出時一律轉回 YYYY-MM-DD
function toDateString_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Taipei', 'yyyy-MM-dd');
  }
  return String(value);
}
