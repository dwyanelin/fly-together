/**
 * fly-together — LINE 航班追蹤設定後端（Google Apps Script）
 *
 * 部署方式見專案 README「透過 LINE 設定航線」一節。
 * 職責：
 *   1. doGet()                → 回傳設定表單頁（由 LINE 圖文選單開啟）
 *   2. doGet(?action=list)    → 回傳 routes JSON（給 GitHub Actions 讀取）
 *   3. submitRoute(data)      → 表單送出：驗證後寫入 Google Sheet（上限 2 格，覆蓋最舊）
 *   4. deleteRoute(target)    → 刪除指定追蹤路線，釋放 2 格額度
 *   5. triggerFlightMonitor() → 定時呼叫 GitHub Actions workflow_dispatch（避開 60 天停用限制）
 *   6. setupMonitorTriggers() → 一次性建立每日 4 次台灣時間觸發條件（08/12/17/22 點）
 *
 * 資料與設定存放：Script Properties（Apps Script 編輯器 → 專案設定 → 指令碼屬性）
 *   - SHEET_ID     ：自動建立的 Google Sheet ID
 *   - GITHUB_TOKEN ：Fine-grained PAT（需開 Actions: Read and write 權限）
 */

var MAX_ROUTES = 2; // 全域路線上限：2 條 × 每天 4 次排程 × 31 天 = 248 次/月 < SerpApi 免費額度 250
var ALLOWED_DEPARTURES = ['TPE', 'TSA'];
var HEADERS = ['outboundDate', 'returnDate', 'departure_id', 'arrival_id', 'maxPrice', 'updatedAt'];

var DEFAULT_GITHUB_REPO = 'dwyanelin/fly-together';
var DEFAULT_GITHUB_WORKFLOW = 'cron.yml';
var DEFAULT_GITHUB_REF = 'main';
var MONITOR_HOURS_TAIPEI = [8, 12, 17, 22];

// ---------- Web entrypoints ----------

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'list') {
    return jsonResponse_({ routes: getRoutes() });
  }
  return HtmlService.createHtmlOutputFromFile('form')
    .setTitle('FlyTogether 航班追蹤設定')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'submit') {
      return jsonResponse_(submitRoute(body.data));
    }
    if (body.action === 'update') {
      return jsonResponse_(updateRoute(body.target, body.data));
    }
    if (body.action === 'delete') {
      return jsonResponse_(deleteRoute(body.target));
    }
    return jsonResponse_({ ok: false, message: '不支援的操作' });
  } catch (err) {
    return jsonResponse_({ ok: false, message: '請求格式錯誤：' + err.message });
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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

function deleteRoute(target) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getOrCreateSheet_();
    var lastRow = sheet.getLastRow();
    var dataRowCount = Math.max(0, lastRow - 1);
    if (dataRowCount === 0) {
      return { ok: false, message: '目前沒有可刪除的路線', routes: [] };
    }

    var rows = sheet.getRange(2, 1, dataRowCount, HEADERS.length).getValues();
    var rowIndexToDelete = -1;

    if (target && typeof target === 'object') {
      for (var i = 0; i < rows.length; i++) {
        var rowUpdatedAt = rows[i][5] ? new Date(rows[i][5]).toISOString() : '';
        var sameRoute =
          toDateString_(rows[i][0]) === String(target.outboundDate || '') &&
          toDateString_(rows[i][1]) === String(target.returnDate || '') &&
          String(rows[i][2]) === String(target.departure_id || '') &&
          String(rows[i][3]) === String(target.arrival_id || '') &&
          Number(rows[i][4]) === Number(target.maxPrice);
        if (sameRoute && (!target.updatedAt || rowUpdatedAt === target.updatedAt)) {
          rowIndexToDelete = i;
          break;
        }
      }
    } else if (typeof target === 'number' && target >= 0 && target < dataRowCount) {
      rowIndexToDelete = target;
    }

    if (rowIndexToDelete === -1) {
      return { ok: false, message: '找不到該路線（可能已被更新或刪除）', routes: getRoutes() };
    }

    sheet.deleteRow(2 + rowIndexToDelete);
    return { ok: true, message: '已刪除該追蹤路線', routes: getRoutes() };
  } finally {
    lock.releaseLock();
  }
}

function updateRoute(target, data) {
  var error = validate_(data);
  if (error) return { ok: false, message: error, routes: getRoutes() };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getOrCreateSheet_();
    var lastRow = sheet.getLastRow();
    var dataRowCount = Math.max(0, lastRow - 1);
    if (dataRowCount === 0) {
      return { ok: false, message: '目前沒有可編輯的路線', routes: [] };
    }

    var rows = sheet.getRange(2, 1, dataRowCount, HEADERS.length).getValues();
    var rowIndexToUpdate = -1;

    if (target && typeof target === 'object') {
      for (var i = 0; i < rows.length; i++) {
        var rowUpdatedAt = rows[i][5] ? new Date(rows[i][5]).toISOString() : '';
        var sameRoute =
          toDateString_(rows[i][0]) === String(target.outboundDate || '') &&
          toDateString_(rows[i][1]) === String(target.returnDate || '') &&
          String(rows[i][2]) === String(target.departure_id || '') &&
          String(rows[i][3]) === String(target.arrival_id || '') &&
          Number(rows[i][4]) === Number(target.maxPrice);
        if (sameRoute && (!target.updatedAt || rowUpdatedAt === target.updatedAt)) {
          rowIndexToUpdate = i;
          break;
        }
      }
    } else if (typeof target === 'number' && target >= 0 && target < dataRowCount) {
      rowIndexToUpdate = target;
    }

    if (rowIndexToUpdate === -1) {
      return { ok: false, message: '找不到該路線（可能已被更新或刪除）', routes: getRoutes() };
    }

    var updatedRow = [
      data.outboundDate,
      data.returnDate,
      data.departure_id,
      data.arrival_id,
      Number(data.maxPrice),
      new Date().toISOString()
    ];
    sheet.getRange(2 + rowIndexToUpdate, 1, 1, HEADERS.length).setValues([updatedRow]);
    return { ok: true, message: '已更新追蹤路線', routes: getRoutes() };
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
  if (ret < outbound) return '回程日期必須晚於或等於出發日期';

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

// ---------- GitHub Actions Scheduler (Time-driven Trigger) ----------

/**
 * 呼叫 GitHub Actions workflow_dispatch 觸發航班監控。
 * 需先在「專案設定 → 指令碼屬性」新增 GITHUB_TOKEN（Fine-grained PAT，權限 Actions: Read and write）。
 * 選填屬性：GITHUB_REPO、GITHUB_WORKFLOW、GITHUB_REF。
 */
function triggerFlightMonitor() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error('尚未設定指令碼屬性 GITHUB_TOKEN（請至 專案設定 → 指令碼屬性 新增）');
  }

  var repo = props.getProperty('GITHUB_REPO') || DEFAULT_GITHUB_REPO;
  var workflow = props.getProperty('GITHUB_WORKFLOW') || DEFAULT_GITHUB_WORKFLOW;
  var ref = props.getProperty('GITHUB_REF') || DEFAULT_GITHUB_REF;

  var url = 'https://api.github.com/repos/' + repo + '/actions/workflows/' + workflow + '/dispatches';
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({ ref: ref }),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code !== 204) {
    throw new Error('GitHub workflow_dispatch 觸發失敗 (HTTP ' + code + '): ' + res.getContentText());
  }

  Logger.log('Triggered GitHub Actions workflow: ' + repo + '/' + workflow + '@' + ref);
}

/**
 * 一次性設定函式：在 Apps Script 編輯器手動執行一次即可。
 * 會先清除既有的 triggerFlightMonitor 觸發條件（避免重複建立爆額度），
 * 再建立每日台灣時間 08:00 / 12:00 / 17:00 / 22:00 四組排程。
 */
function setupMonitorTriggers() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'triggerFlightMonitor') {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }

  for (var j = 0; j < MONITOR_HOURS_TAIPEI.length; j++) {
    ScriptApp.newTrigger('triggerFlightMonitor')
      .timeBased()
      .everyDays(1)
      .atHour(MONITOR_HOURS_TAIPEI[j])
      .inTimezone('Asia/Taipei')
      .create();
  }

  Logger.log('已建立 ' + MONITOR_HOURS_TAIPEI.length + ' 組每日排程（台灣時間 ' + MONITOR_HOURS_TAIPEI.join(':00 / ') + ':00）');
}

