/**
 * C++ Mission Lab — Google Apps Script receiver.
 * Sheet target is stored in Script Properties by setup().
 * Long code submissions arrive through short JSONP chunks.
 */
const SHEET_NAME = 'Hasil Tugas C++';
const HEADERS = [
  'Nama Peserta', 'Tugas', 'Waktu Submit', 'Kode C++', 'Status',
  'Test Lolos', 'Total Test', 'Nilai Akhir', 'Rincian Pengujian'
];
const MAX_SUBMISSION_CHARS = 90000;
const MAX_CHUNKS = 200;
const CHUNK_TTL_SECONDS = 600;

function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Buka Apps Script dari Google Spreadsheet tujuan.');

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#173b35')
    .setFontColor('#ffffff');
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 190);
  sheet.setColumnWidth(3, 165);
  sheet.setColumnWidth(4, 480);
  sheet.setColumnWidth(9, 420);

  // Tidak menghapus isi sheet yang sudah ada.
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  return 'Setup selesai: ' + spreadsheet.getUrl();
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = String(params.callback || '');
  let result;

  try {
    if (params.action === 'chunk') {
      result = receiveChunk_(params);
    } else if (params.action === 'ping') {
      result = { ok: true, message: 'C++ Mission Lab endpoint aktif.' };
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

  // Decode base64url -> UTF-8 JSON.
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
  // Cegah formula injection pada data teks siswa.
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function saveSubmission_(payload) {
  const name = String(payload.name || '').trim();
  const task = String(payload.task || '').trim();
  const code = String(payload.code || '');
  if (!name || !task || !code.trim()) throw new Error('Nama, tugas, dan kode wajib diisi.');
  if (name.length > 120) throw new Error('Nama terlalu panjang.');
  if (code.length > 45000) throw new Error('Kode C++ melebihi batas 45.000 karakter.');
  if (!['Smart Canteen', 'Student Analytics'].includes(task)) throw new Error('Nama tugas tidak valid.');

  const passed = Math.max(0, Math.min(3, Number(payload.passed) || 0));
  const total = Math.max(1, Math.min(3, Number(payload.total) || 1));
  const score = Math.max(0, Math.min(100, Math.round(passed / total * 100)));
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Spreadsheet tujuan tidak ditemukan. Jalankan setup() terlebih dahulu.');

  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet belum dibuat. Jalankan setup() terlebih dahulu.');

  const details = String(payload.details || '');
  sheet.appendRow([
    safeCellText_(name),
    task,
    new Date(),
    safeCellText_(code),
    score === 100 ? 'LULUS' : 'TERKIRIM',
    passed,
    total,
    score,
    safeCellText_(details.slice(0, 45000))
  ]);

  return { ok: true, complete: true, score: score, message: 'Submission tersimpan.' };
}
