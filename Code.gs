/**
 * C++ Mission Lab — Google Apps Script receiver.
 * Sheet target is stored in Script Properties by setup().
 * Long code submissions arrive through short JSONP chunks.
 *
 * Schema migration is additive: existing columns and rows are preserved.
 */
const SHEET_NAME = 'Hasil Tugas C++';
const TIME_ZONE = 'Asia/Jakarta';
const HEADERS = [
  'Nama Peserta', 'Tugas', 'Waktu Submit', 'Kode C++', 'Status',
  'Test Lolos', 'Total Test', 'Nilai Akhir', 'Rincian Pengujian',
  'Tanggal Submit', 'Jam Submit', 'Keberhasilan', 'Waktu Mulai',
  'Sisa Waktu Saat Submit', 'Lama Pengerjaan', 'Jumlah Pelanggaran',
  'Rincian Pelanggaran', 'Jenis Aktivitas', 'STDIN', 'STDOUT',
  'Durasi Eksekusi (ms)', 'Jenis Submit', 'ID Pengiriman'
];
const MAX_SUBMISSION_CHARS = 110000;
const MAX_CHUNKS = 240;
const CHUNK_TTL_SECONDS = 600;

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return HEADERS.slice();
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  let current = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function (value) { return String(value || '').trim(); });

  if (!current.some(Boolean)) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return HEADERS.slice();
  }

  const missing = HEADERS.filter(function (header) {
    return current.indexOf(header) === -1;
  });
  if (missing.length) {
    sheet.getRange(1, lastColumn + 1, 1, missing.length).setValues([missing]);
    current = current.concat(missing);
  }
  return current;
}

function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Buka Apps Script dari Google Spreadsheet tujuan.');

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  const headers = ensureHeaders_(sheet);
  const headerMap = {};
  headers.forEach(function (header, index) {
    headerMap[header] = index + 1;
  });

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#173b35')
    .setFontColor('#ffffff')
    .setWrap(true);

  const widths = {
    'Nama Peserta': 190,
    'Tugas': 170,
    'Waktu Submit': 165,
    'Kode C++': 480,
    'Status': 120,
    'Test Lolos': 90,
    'Total Test': 90,
    'Nilai Akhir': 95,
    'Rincian Pengujian': 380,
    'Tanggal Submit': 115,
    'Jam Submit': 95,
    'Keberhasilan': 190,
    'Waktu Mulai': 165,
    'Sisa Waktu Saat Submit': 155,
    'Lama Pengerjaan': 135,
    'Jumlah Pelanggaran': 125,
    'Rincian Pelanggaran': 360,
    'Jenis Aktivitas': 145,
    'STDIN': 240,
    'STDOUT': 320,
    'Durasi Eksekusi (ms)': 145,
    'Jenis Submit': 170,
    'ID Pengiriman': 260
  };
  Object.keys(widths).forEach(function (header) {
    if (headerMap[header]) sheet.setColumnWidth(headerMap[header], widths[header]);
  });

  // Tidak menghapus isi sheet atau kolom lama.
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  return 'Setup selesai. Header lama dipertahankan dan kolom baru ditambahkan: ' + spreadsheet.getUrl();
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = String(params.callback || '');
  let result;

  try {
    if (params.action === 'chunk') {
      result = receiveChunk_(params);
    } else if (params.action === 'ping') {
      result = { ok: true, schemaVersion: 2, message: 'C++ Mission Lab endpoint aktif.' };
    } else {
      throw new Error('Action tidak dikenali.');
    }
  } catch (error) {
    result = { ok: false, message: String(error.message || error) };
  }

  return jsonpResponse_(result, callback);
}

function jsonpResponse_(result, callback) {
  const json = JSON.stringify(result);
  if (callback && /^[a-zA-Z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function receiveChunk_(params) {
  const session = String(params.session || '');
  const index = Number(params.index);
  const total = Number(params.total);
  const data = String(params.data || '');

  if (!/^[a-zA-Z0-9_]{8,100}$/.test(session)) throw new Error('ID pengiriman tidak valid.');
  if (!Number.isInteger(total) || total < 1 || total > MAX_CHUNKS) throw new Error('Jumlah potongan tidak valid.');
  if (!Number.isInteger(index) || index < 0 || index >= total) throw new Error('Urutan potongan tidak valid.');
  if (!data || data.length > 700 || !/^[a-zA-Z0-9_-]+$/.test(data)) throw new Error('Data potongan tidak valid.');

  const cache = CacheService.getScriptCache();
  const cacheKey = 'cppMission_' + session + '_' + index;
  cache.put(cacheKey, data, CHUNK_TTL_SECONDS);

  if (index !== total - 1) {
    return { ok: true, complete: false, received: index + 1, total: total };
  }

  const keys = [];
  for (let i = 0; i < total; i++) keys.push('cppMission_' + session + '_' + i);
  const stored = cache.getAll(keys);
  let encoded = '';
  for (let i = 0; i < total; i++) {
    const part = stored[keys[i]];
    if (!part) throw new Error('Potongan data ' + (i + 1) + ' belum diterima. Silakan kirim ulang.');
    encoded += part;
  }
  cache.removeAll(keys);

  while (encoded.length % 4) encoded += '=';
  const bytes = Utilities.base64DecodeWebSafe(encoded);
  const payloadText = Utilities.newBlob(bytes).getDataAsString('UTF-8');
  if (payloadText.length > MAX_SUBMISSION_CHARS) throw new Error('Ukuran tugas melebihi batas yang diizinkan.');

  const payload = JSON.parse(payloadText);
  const saved = saveSubmission_(payload);
  saved.complete = true;
  return saved;
}

function safeCellText_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function formatDuration_(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const remainder = String(safe % 60).padStart(2, '0');
  return hours + ':' + minutes + ':' + remainder;
}

function parseViolationLog_(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveSubmission_(payload) {
  const name = String(payload.name || '').trim();
  const task = String(payload.task || '').trim();
  const code = String(payload.code || '');
  if (!name || !task || !code.trim()) throw new Error('Nama, tugas, dan kode wajib diisi.');
  if (name.length > 120) throw new Error('Nama terlalu panjang.');
  if (code.length > 45000) throw new Error('Kode C++ melebihi batas 45.000 karakter.');
  const allowedTasks = [
    'Smart Canteen', 'Smart Parking Gate', 'Rekap Nilai Akademik', 'ATM Simulator',
    'Smart Courier', 'Theme Park Ticketing', 'Robot Tournament Scoring',
    'Warehouse Stock Control', 'Internet Plan Billing', 'Festival Ticketing System'
  ];
  if (allowedTasks.indexOf(task) === -1) throw new Error('Nama tugas tidak valid.');

  const submissionId = String(payload.submissionId || '').trim();
  if (submissionId && !/^[a-zA-Z0-9_-]{8,180}$/.test(submissionId)) {
    throw new Error('ID pengiriman tidak valid.');
  }

  const activityType = String(payload.activityType || (
    String(payload.submitType || '').indexOf('OTOMATIS') === 0 ? 'AUTO SUBMIT' : 'SUBMIT MISSION'
  )).trim();
  const allowedActivityTypes = ['RUN CODE', 'CHECK TESTS', 'SUBMIT MISSION', 'AUTO SUBMIT'];
  if (allowedActivityTypes.indexOf(activityType) === -1) throw new Error('Jenis aktivitas tidak valid.');

  const rawTotal = Number(payload.total);
  const hasTestMetrics = payload.total !== undefined && payload.total !== null &&
    payload.total !== '' && Number.isFinite(rawTotal) && rawTotal > 0;
  const total = hasTestMetrics ? Math.max(1, Math.min(3, Math.floor(rawTotal))) : 0;
  const passed = hasTestMetrics ? Math.max(0, Math.min(total, Number(payload.passed) || 0)) : 0;
  const score = hasTestMetrics ? Math.max(0, Math.min(100, Math.round(passed / total * 100))) : '';

  const executionStatus = String(payload.executionStatus || '').slice(0, 120);
  let statusText;
  if (activityType === 'RUN CODE' || !hasTestMetrics) {
    statusText = executionStatus || (activityType === 'RUN CODE' ? 'DIJALANKAN' : 'TERKIRIM');
  } else {
    statusText = score === 100 ? 'LULUS' : 'BELUM LULUS';
  }
  const durationMsValue = Number(payload.durationMs);
  const durationMs = Number.isFinite(durationMsValue) ? Math.max(0, Math.min(600000, Math.floor(durationMsValue))) : '';

  const rawElapsed = Number(payload.elapsedSeconds);
  const elapsedSeconds = Number.isFinite(rawElapsed) ? Math.max(0, Math.min(86400, Math.floor(rawElapsed))) : 0;
  const rawRemaining = Number(payload.remainingSeconds);
  const remainingSeconds = Number.isFinite(rawRemaining) ? Math.max(0, Math.min(SESSION_SECONDS_LIMIT_(), Math.floor(rawRemaining))) : 0;
  const rawViolationCount = Number(payload.violationCount);
  const violations = parseViolationLog_(payload.violations).slice(0, 200).map(function (item) {
    return {
      reason: String((item && item.reason) || 'Pelanggaran').slice(0, 250),
      occurredAt: String((item && item.occurredAt) || '').slice(0, 40),
      penaltyMinutes: Math.max(0, Math.min(120, Number(item && item.penaltyMinutes) || 0))
    };
  });
  const reportedViolationCount = Number.isFinite(rawViolationCount) ? Math.max(0, Math.min(10000, Math.floor(rawViolationCount))) : 0;
  const violationCount = Math.max(reportedViolationCount, violations.length);

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Spreadsheet tujuan tidak ditemukan. Jalankan setup() terlebih dahulu.');

  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet belum dibuat. Jalankan setup() terlebih dahulu.');

  const headers = ensureHeaders_(sheet);
  const submittedAt = new Date();
  const startedAtMs = Number(payload.startedAtMs);
  const startedAt = Number.isFinite(startedAtMs) && startedAtMs > 0 ? new Date(startedAtMs) : null;
  const dateText = Utilities.formatDate(submittedAt, TIME_ZONE, 'dd/MM/yyyy');
  const timeText = Utilities.formatDate(submittedAt, TIME_ZONE, 'HH:mm:ss');
  const startText = startedAt ? Utilities.formatDate(startedAt, TIME_ZONE, 'dd/MM/yyyy HH:mm:ss') : '';
  const successText = hasTestMetrics
    ? passed + '/' + total + ' test berhasil (' + score + '%)'
    : (executionStatus || statusText);
  const violationText = violations.map(function (item, index) {
    let when = 'waktu tidak tersedia';
    if (item.occurredAt) {
      const eventDate = new Date(item.occurredAt);
      if (!isNaN(eventDate.getTime())) {
        when = Utilities.formatDate(eventDate, TIME_ZONE, 'dd/MM/yyyy HH:mm:ss');
      }
    }
    return (index + 1) + '. ' + item.reason + ' | ' + when + ' | penalti ' + item.penaltyMinutes + ' menit';
  }).join('\n');

  const data = {
    'Nama Peserta': safeCellText_(name),
    'Tugas': safeCellText_(task),
    'Waktu Submit': submittedAt,
    'Kode C++': safeCellText_(code),
    'Status': statusText,
    'Test Lolos': hasTestMetrics ? passed : '',
    'Total Test': hasTestMetrics ? total : '',
    'Nilai Akhir': hasTestMetrics ? score : '',
    'Rincian Pengujian': safeCellText_(String(payload.details || '').slice(0, 45000)),
    'Jenis Aktivitas': safeCellText_(activityType),
    'STDIN': safeCellText_(String(payload.stdin || '').slice(0, 10000)),
    'STDOUT': safeCellText_(String(payload.stdout || '').slice(0, 15000)),
    'Durasi Eksekusi (ms)': durationMs,
    'Tanggal Submit': dateText,
    'Jam Submit': timeText,
    'Keberhasilan': successText,
    'Waktu Mulai': startText,
    'Sisa Waktu Saat Submit': formatDuration_(remainingSeconds),
    'Lama Pengerjaan': formatDuration_(elapsedSeconds),
    'Jumlah Pelanggaran': violationCount,
    'Rincian Pelanggaran': safeCellText_(violationText.slice(0, 20000)),
    'Jenis Submit': safeCellText_(String(payload.submitType || 'MANUAL').slice(0, 80)),
    'ID Pengiriman': submissionId
  };

  const row = headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(data, header) ? data[header] : '';
  });
  const idColumn = headers.indexOf('ID Pengiriman') + 1;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (submissionId && idColumn > 0 && sheet.getLastRow() > 1) {
      const duplicate = sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1)
        .createTextFinder(submissionId)
        .matchEntireCell(true)
        .findNext();
      if (duplicate) {
        return { ok: true, complete: true, duplicate: true, score: score, violationCount: violationCount, message: 'Submission sudah pernah tersimpan.' };
      }
    }
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, complete: true, score: score, violationCount: violationCount, message: 'Submission tersimpan.' };
}

function SESSION_SECONDS_LIMIT_() {
  return 60 * 60;
}
