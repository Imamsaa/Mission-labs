import { basicSetup, EditorView } from 'codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentMore, indentLess, toggleComment } from '@codemirror/commands';
import { Compartment } from '@codemirror/state';

const $ = s => document.querySelector(s);
const RULES = Object.freeze({
  restrictClipboard: true,
  penalizeTabSwitch: true,
  penalizeContextMenu: true,
  penalizeSystemShortcuts: true,
  penaltyMinutes: 5,
  ...(window.MISSION_RULES || {})
});
document.documentElement.classList.toggle('clipboard-protection-enabled', Boolean(RULES.restrictClipboard));
const ICON_PATHS = Object.freeze({
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  coffee: '<path d="M4 8h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 3v2m5-2v2"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  terminal: '<path d="m5 7 5 5-5 5M13 17h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  x: '<path d="m18 6-12 12M6 6l12 12"/>',
  play: '<path d="m8 5 12 7-12 7V5Z"/>',
  reset: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 20h16"/>',
  alert: '<path d="M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 3h.01"/>'
});
function icon(name,size=14,className='') {
  const shape=ICON_PATHS[name]||ICON_PATHS.terminal;
  return `<svg class="ui-icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shape}</svg>`;
}

const SESSION_SECONDS = Math.max(1, Number(RULES.sessionMinutes) || 70) * 60;
const DEADLINE_TIMESTAMP = Date.parse(RULES.deadlineAt || '2026-11-03T14:50:00+07:00');
const START_KEY = 'cppMissionLab_sessionStart_v3';
const FINISHED_KEY = 'cppMissionLab_sessionFinished_v3';
const PENALTY_KEY = 'cppMissionLab_penaltySeconds_v1';
const VIOLATION_COUNT_KEY = 'cppMissionLab_violationCount_v1';
const VIOLATION_LOG_KEY = 'cppMissionLab_violationLog_v1';
const PROGRESS_KEY = 'cppMissionLab_progress_v3';
const NAME_KEY = 'cppMissionLab_studentName_v3';
const APPS_SCRIPT_URL = window.CPP_MISSION_APPS_SCRIPT_URL || '';
const starterCode = `#include <iostream>
#include <string>
#include <iomanip>
using namespace std;

int main() {
    // Tulis programmu di sini.

    return 0;
}`;

const tasks = [
  {
    id: 'smart-canteen', title: 'Smart Canteen', subtitle: 'Bangun sistem kasir kantin dengan transaksi berulang dan logika diskon bertingkat.', category: 'TRANSACTION & DECISION LOGIC', sampleInput: '1\n1 5\n3 5\n0 0\n1',
    brief: `<p class="problem-description">Kantin sekolah membutuhkan aplikasi kasir yang mampu melayani beberapa jenis barang dalam satu transaksi. Program harus memvalidasi input, menghitung subtotal, menentukan diskon berdasarkan status pelanggan, dan menghitung biaya pembayaran.</p>
      <div class="section-block"><h3>Daftar produk</h3><table class="task-table"><thead><tr><th>Kode</th><th>Produk</th><th>Harga</th></tr></thead><tbody><tr><td>1</td><td>Nasi Goreng</td><td>12000</td></tr><tr><td>2</td><td>Roti Bakar</td><td>8000</td></tr><tr><td>3</td><td>Jus Buah</td><td>6000</td></tr><tr><td>4</td><td>Air Mineral</td><td>4000</td></tr></tbody></table></div>
      <div class="section-block"><h3>Ketentuan program</h3><ol><li>Minta status pelanggan: <code>1</code> = member, <code>0</code> = bukan member. Validasi agar hanya menerima angka 0 atau 1.</li><li>Gunakan <code>do-while</code> untuk mengulang input barang. Masukkan kode produk dan jumlah. Masukkan <code>0 0</code> untuk mengakhiri transaksi.</li><li>Gunakan <code>switch-case</code> untuk menentukan harga produk. Kode produk yang tidak tersedia harus ditolak.</li><li>Validasi jumlah barang: minimal 1 dan maksimal 20. Kode maupun jumlah tidak valid tidak boleh masuk perhitungan.</li><li>Hitung jumlah transaksi barang valid, jumlah seluruh barang, dan subtotal.</li><li>Terapkan diskon menggunakan <code>if / else if / else</code> dan <b>nested if</b> sesuai aturan.</li><li>Gunakan <code>switch-case</code> untuk pembayaran: 1 = tunai (biaya admin 0), 2 = QRIS (biaya admin 1% dari total setelah diskon).</li><li>Tampilkan ringkasan akhir dengan label yang persis sama seperti contoh output.</li></ol></div>
      <div class="callout"><b>Aturan diskon</b><br><b>Member:</b> subtotal ≥ 50.000 mendapat 15%; subtotal ≥ 25.000 mendapat 10%; selain itu 0%.<br><b>Bukan member:</b> subtotal ≥ 100.000 mendapat 10%; subtotal ≥ 50.000 mendapat 5%; selain itu 0%.</div>
      <div class="section-block"><h3>Format input</h3><pre class="sample-block">1             // status member
1 5           // kode 1, beli 5
3 5           // kode 3, beli 5
0 0           // akhir belanja
1             // pembayaran tunai</pre><h3>Format output wajib</h3><pre class="sample-block">Jumlah Transaksi: 2
Jumlah Barang: 10
Subtotal: 90000
Diskon: 13500
Biaya Admin: 0
Total Bayar: 76500</pre><p class="hint">Prompt tambahan boleh ditampilkan, tetapi enam baris ringkasan harus memiliki label persis sama. Angka ditulis tanpa pemisah ribuan maupun simbol mata uang.</p></div>`,
    rubric: `<h3>Rubrik penilaian · 100 poin</h3><div class="rubric-list"><div><span>Validasi status member, kode produk, dan jumlah</span><b>15</b></div><div><span>Perulangan transaksi menggunakan do-while</span><b>15</b></div><div><span>Pemilihan produk dan pembayaran menggunakan switch-case</span><b>15</b></div><div><span>Akumulasi transaksi, barang, dan subtotal</span><b>15</b></div><div><span>Diskon bertingkat, nested if, dan operator logika</span><b>20</b></div><div><span>Perhitungan admin dan format laporan</span><b>20</b></div></div><div class="callout">Nilai otomatis berdasarkan 3 skenario uji. Guru tetap dapat memeriksa kode untuk memastikan struktur percabangan dan perulangan digunakan dengan benar.</div>`,
    materials: `<h3>Materi yang harus tampak dalam kode</h3><ul><li>Variabel, tipe data, konstanta, dan operasi aritmatika.</li><li><code>cin</code>, <code>cout</code>, dan urutan input.</li><li>Operator perbandingan dan logika <code>&amp;&amp;</code> / <code>||</code>.</li><li><code>if / else if / else</code> dan nested <code>if</code>.</li><li><code>switch-case</code> untuk produk dan pembayaran.</li><li><code>do-while</code> untuk transaksi berulang.</li></ul><p class="hint">Array, vector, function, dan pointer tidak diperlukan. Fokus pada materi yang sudah dipelajari.</p>`,
    tests: [
      { name: 'Test 1 · Member + tunai', input: '1\n1 5\n3 5\n0 0\n1', checks: [['Jumlah Transaksi',2],['Jumlah Barang',10],['Subtotal',90000],['Diskon',13500],['Biaya Admin',0],['Total Bayar',76500]] },
      { name: 'Test 2 · Non-member + QRIS', input: '0\n2 4\n4 5\n0 0\n2', hidden:true, checks: [['Jumlah Transaksi',2],['Jumlah Barang',9],['Subtotal',52000],['Diskon',2600],['Biaya Admin',494],['Total Bayar',49894]] },
      { name: 'Test 3 · Kode tidak valid', input: '1\n2 3\n9 1\n4 1\n0 0\n1', hidden:true, checks: [['Jumlah Transaksi',2],['Jumlah Barang',4],['Subtotal',28000],['Diskon',2800],['Biaya Admin',0],['Total Bayar',25200]] },
    ],
  },
];

let currentTask = 0, editor, editorCompartment, timerInterval = null, compileBusy = false;
let compileWorker = null, runtimeWorker = null, cancelActive = null;
let sessionStarted = Boolean(Number(localStorage.getItem(START_KEY)));
let sessionFinished = localStorage.getItem(FINISHED_KEY) === '1';
// Migrate an older paused session once, then discard its break-mode state.
try {
  const legacyBreak = JSON.parse(localStorage.getItem('cppMissionLab_breakState_v3') || 'null');
  if (legacyBreak?.active && Number.isFinite(Number(legacyBreak.pausedRemaining))) {
    const pausedRemaining = Math.max(0, Math.min(SESSION_SECONDS, Number(legacyBreak.pausedRemaining)));
    const elapsedBeforeBreak = SESSION_SECONDS - pausedRemaining;
    localStorage.setItem(START_KEY, String(Date.now() - elapsedBeforeBreak * 1000));
  }
} catch (error) { console.warn('Legacy session migration skipped:', error); }
localStorage.removeItem('cppMissionLab_breakState_v3');
let lastSubmission = null, compiledSource = '', compiledModule = null;
let progress;
try { progress=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{"solved":[],"drafts":{},"scores":{}}'); } catch { progress={solved:[],drafts:{},scores:{}}; }

function toast(message,type='good') { const node=document.createElement('div');node.className=`toast ${type}`;node.textContent=message;$('#toastRegion').append(node);setTimeout(()=>node.remove(),3600); }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function saveProgress() { localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));renderProgress(); }
function renderProgress() { const validIds=tasks.map(task=>task.id);progress.solved=(progress.solved||[]).filter(id=>validIds.includes(id));const done=progress.solved.length;const percent=tasks.length?Math.round(done/tasks.length*100):0;$('#solvedCount').textContent=done;$('#xpTotal').textContent=done*500;$('#progressPercent').textContent=`${percent}%`;$('#progressBar').style.width=`${percent}%`;tasks.forEach((task,i)=>{const el=$(`#done${i}`);if(el){const solved=progress.solved.includes(task.id);el.innerHTML=icon(solved?'checkCircle':'circle',15,solved?'is-done':'is-pending');el.setAttribute('aria-label',solved?'Selesai':'Belum selesai');}}); }
function getCode() { return editor.state.doc.toString(); }
function setCode(value) { editor.dispatch({changes:{from:0,to:editor.state.doc.length,insert:value}}); }
function saveDraft() { progress.drafts=progress.drafts||{};progress.drafts[tasks[currentTask].id]=getCode();localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));$('#editorStatus').textContent='Draft tersimpan';if(lastSubmission&&lastSubmission.code!==getCode()){lastSubmission=null;$('#submitBtn').disabled=true;$('#scorePreview').textContent='Kode berubah · Jalankan Check Tests kembali.';}updateCursorInfo(); }
function updateCursorInfo() { if(!editor?.state)return;const pos=editor.state.selection.main.head;const line=editor.state.doc.lineAt(pos);$('#lineCount').textContent=line.number;$('#columnCount').textContent=pos-line.from+1; }
function renderTask(index) {
  if(compileBusy){toast('Tunggu proses kompilasi selesai sebelum berpindah tugas.','bad');return;}saveDraft();currentTask=index;const task=tasks[index];
  document.querySelectorAll('.challenge-item').forEach((b,i)=>b.classList.toggle('active',i===index));
  $('#problemNumber').textContent=String(index+1).padStart(2,'0');$('#problemStage').textContent=task.category;$('#problemTitle').textContent=task.title;$('#problemSubtitle').textContent=task.subtitle;$('#problemDifficulty').textContent='CHALLENGE';
  $('#descriptionTab').innerHTML=task.brief;$('#rubricTab').innerHTML=task.rubric;$('#materialsTab').innerHTML=task.materials;
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='description'));['description','rubric','materials'].forEach(t=>$(`#${t}Tab`).classList.toggle('hidden',t!=='description'));
  setCode(progress.drafts?.[task.id]||starterCode);$('#stdinInput').value=task.sampleInput;$('#testResultCount').textContent='—';$('#runDuration').textContent='';$('#scorePreview').textContent='Jalankan Check Tests sebelum submit.';$('#submitBtn').disabled=true;lastSubmission=null;compiledSource='';compiledModule=null;
  $('#outputView').innerHTML=`<div class="empty-console"><span class="terminal-glyph">${icon('terminal',18)}</span><div><strong>Terminal output</strong><p>Jalankan kode C++ untuk melihat hasilnya.</p></div></div>`;
  $('#testsView').innerHTML=`<div class="empty-console"><span class="terminal-glyph">${icon('checkCircle',18)}</span><div><strong>Belum ada hasil test</strong><p>Tekan Check Tests untuk menjalankan tiga skenario pengujian.</p></div></div>`;showConsole('input');updateSessionLock();
}
function showConsole(name) { ['input','output','tests'].forEach(k=>{$(`#${k}View`).classList.toggle('hidden',k!==name);document.querySelector(`[data-console-tab="${k}"]`).classList.toggle('active',k===name);}); }
function getPenaltySeconds() {
  const value = Number(localStorage.getItem(PENALTY_KEY) || 0);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
function getViolationCount() {
  const value = Number(localStorage.getItem(VIOLATION_COUNT_KEY) || 0);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
function getViolationLog() {
  try {
    const rows = JSON.parse(localStorage.getItem(VIOLATION_LOG_KEY) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}
function elapsedSessionSeconds() {
  const startedAt = Number(localStorage.getItem(START_KEY));
  return startedAt > 0 ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;
}
function formatDurationForSheet(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return hours + ':' + minutes + ':' + seconds;
}
function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return minutes + ':' + seconds;
}
function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return hours + ':' + minutes + ':' + seconds;
}
function deadlineRemainingSeconds() {
  if (!Number.isFinite(DEADLINE_TIMESTAMP)) return 0;
  return Math.max(0, Math.ceil((DEADLINE_TIMESTAMP - Date.now()) / 1000));
}
function renderPenalty() {
  const total = getPenaltySeconds();
  const chip = $('#penaltyChip');
  if (!chip) return;
  chip.hidden = total <= 0;
  $('#penaltyDisplay').textContent = '−' + formatClock(total);
  chip.title = 'Total pengurangan waktu: ' + formatClock(total);
}
function baseRemaining() {
  if (sessionFinished) return 0;
  const startedAt = Number(localStorage.getItem(START_KEY));
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  return Math.max(0, SESSION_SECONDS - elapsed - getPenaltySeconds());
}
function remainingSeconds() { return baseRemaining(); }
function updateTimer() {
  const seconds = remainingSeconds();
  const deadlineSeconds = deadlineRemainingSeconds();
  const deadlineText = formatCountdown(deadlineSeconds);
  $('#timerDisplay').textContent = formatClock(seconds);
  $('#timerDisplay').style.color = seconds === 0 ? '#ff8997' : '';
  const deadlineDisplay = $('#deadlineDisplay');
  const deadlineModalCountdown = $('#deadlineModalCountdown');
  if (deadlineDisplay) deadlineDisplay.textContent = deadlineText;
  if (deadlineModalCountdown) deadlineModalCountdown.textContent = deadlineText;
  const startButton = $('#startSessionSubmit');
  if (startButton) startButton.disabled = deadlineSeconds <= 0 || sessionFinished;
  const deadlineMessage = $('#deadlineModalMessage');
  if (deadlineMessage && deadlineSeconds <= 0) {
    deadlineMessage.textContent = 'Batas akhir pukul ' + (RULES.deadlineLabel || '14.50 WIB') + ' telah tercapai. Sesi baru tidak dapat dimulai.';
  }
  renderPenalty();
  if (sessionStarted && deadlineSeconds <= 0) {
    finishSession(true, 'Batas akhir pengerjaan pukul ' + (RULES.deadlineLabel || '14.50 WIB') + ' telah tercapai.');
  } else if (sessionStarted && seconds <= 0) {
    finishSession(true, 'Waktu pengerjaan ' + SESSION_SECONDS / 60 + ' menit telah habis.');
  }
}
function recordViolation(reason) {
  if (!sessionStarted || sessionFinished) return false;
  const before = remainingSeconds();
  if (before <= 0) { finishSession(true); return false; }

  const penaltyMinutes = Math.max(0, Number(RULES.penaltyMinutes) || 0);
  const penaltySeconds = Math.round(penaltyMinutes * 60);
  const totalPenalty = getPenaltySeconds() + penaltySeconds;
  const event = {
    reason: String(reason || 'Pelanggaran aturan').slice(0, 250),
    occurredAt: new Date().toISOString(),
    penaltyMinutes: penaltyMinutes
  };
  const log = getViolationLog();
  log.push(event);
  localStorage.setItem(VIOLATION_COUNT_KEY, String(getViolationCount() + 1));
  localStorage.setItem(VIOLATION_LOG_KEY, JSON.stringify(log.slice(-200)));
  localStorage.setItem(PENALTY_KEY, String(totalPenalty));

  renderPenalty();
  updateTimer();
  const after = remainingSeconds();
  const penaltyLabel = formatClock(penaltySeconds);
  const message = 'Pelanggaran terdeteksi: ' + event.reason + '. Waktu dikurangi ' + penaltyLabel + '. Sisa waktu: ' + formatClock(after) + '.';
  showWarning('Pelanggaran Aturan', message);
  toast('Pelanggaran #' + getViolationCount() + ' dicatat · −' + penaltyLabel + ' · Sisa waktu ' + formatClock(after), 'bad');
  return true;
}
function finishSession(notify=true, reason='Waktu pengerjaan habis. Semua tantangan dikunci.') {
  if(sessionFinished)return;sessionFinished=true;localStorage.setItem(FINISHED_KEY,'1');if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
  if(compileWorker)compileWorker.terminate();if(runtimeWorker)runtimeWorker.terminate();if(cancelActive)cancelActive(new Error(reason));
  updateSessionLock();if(notify)toast(reason,'bad');
}
function startSession() {
  if(sessionStarted||sessionFinished)return false;
  if (deadlineRemainingSeconds() <= 0) {
    finishSession(true, 'Batas akhir pengerjaan pukul ' + (RULES.deadlineLabel || '14.50 WIB') + ' telah tercapai.');
    return false;
  }
  localStorage.setItem(PENALTY_KEY,'0');
  localStorage.setItem(VIOLATION_COUNT_KEY,'0');
  localStorage.setItem(VIOLATION_LOG_KEY,'[]');
  renderPenalty();
  localStorage.setItem(START_KEY,String(Date.now()));
  sessionStarted=true;
  updateSessionLock();
  toast('Sesi dimulai. Waktu ' + SESSION_SECONDS / 60 + ' menit berjalan.');
  updateTimer();
  if (!timerInterval) timerInterval=setInterval(updateTimer,1000);
  return true;
}
function openStartSessionModal() {
  const modal=$('#startSessionModal');
  if(!modal || sessionFinished) return;
  const savedName=localStorage.getItem(NAME_KEY)||'';
  $('#startStudentName').value=savedName;
  const needsName=!savedName.trim();
  if(sessionStarted && !needsName) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
    return;
  }
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  $('#startStudentName').focus();
}
function submitStartSession(event) {
  event.preventDefault();
  if(sessionFinished) return;
  const name=$('#startStudentName').value.trim();
  if(!name) {
    $('#startSessionError').hidden=false;
    $('#startStudentName').setAttribute('aria-invalid','true');
    $('#startStudentName').focus();
    return;
  }
  $('#startSessionError').hidden=true;
  $('#startStudentName').removeAttribute('aria-invalid');
  localStorage.setItem(NAME_KEY,name);
  $('#studentName').value=name;
  $('#startSessionModal').classList.add('hidden');
  $('#startSessionModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
  if(!sessionStarted) startSession();
  else toast('Nama siswa tersimpan. Sesi yang sedang berjalan dilanjutkan.');
}
function updateSessionLock() {
  const preStart = !sessionStarted && !sessionFinished;
  const finished = sessionFinished;
  const locked = preStart || finished;
  editor.dispatch({effects:editorCompartment.reconfigure(EditorView.editable.of(!locked))});
  ['runBtn','checkTestsBtn','submitBtn','resetCodeBtn','stdinInput','useSampleInputBtn','studentName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = locked || (id === 'submitBtn' && !lastSubmission);
  });
  document.querySelectorAll('.challenge-item').forEach(el => el.disabled = locked);
  $('#sessionLockOverlay').classList.toggle('hidden', !locked);
  $('#sessionLockTitle').textContent = finished ? 'Waktu pengerjaan habis' : 'Sesi belum dimulai';
  $('#sessionLockMessage').textContent = finished
    ? 'Waktu pengerjaan telah habis. Editor, input, pengujian, dan pengiriman dikunci.'
    : 'Isi nama lengkap pada layar pembuka untuk memulai sesi pengerjaan.';
  $('#editorStatus').textContent = finished ? 'Sesi berakhir · Editor terkunci' : preStart ? 'Terkunci · Mulai sesi untuk coding' : 'Draft tersimpan';
  $('#editorHost').classList.toggle('session-locked', locked);
  updateTimer();
}
function showOutput(text,kind='') { $('#outputView').innerHTML=`<pre class="console-output ${kind}">${escapeHTML(text)}</pre>`;showConsole('output'); }
function showLoading(title,message,percent=15) { $('#loadingTitle').textContent=title;$('#loadingMessage').textContent=message;$('#loadingProgress').style.width=`${percent}%` ;$('#loadingOverlay').classList.remove('hidden'); }
function hideLoading() { $('#loadingOverlay').classList.add('hidden'); }
function runCompilerWorker(source, options = {}) {
  const mode = options.mode === 'tests' ? 'tests' : 'run';
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./compiler-worker.js?v=compiler-parity-20261103', import.meta.url), { type: 'module' });
    compileWorker = worker;
    let settled = false;
    let timeout = null;

    function cleanup() {
      if (timeout) clearTimeout(timeout);
      worker.terminate();
      if (compileWorker === worker) compileWorker = null;
      if (cancelActive === cancel) cancelActive = null;
    }
    function cancel(error) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error || 'Proses dibatalkan.')));
    }
    function finish(value) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    }
    function armTimeout(milliseconds, message) {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => cancel(new Error(message)), milliseconds);
    }

    cancelActive = cancel;
    armTimeout(180000, 'Compiler timeout. Periksa koneksi internet lalu coba lagi.');

    worker.onmessage = event => {
      const data = event.data || {};

      if (data.type === 'status') {
        showLoading('Menyiapkan compiler C++17...', data.message || 'Memuat Clang WebAssembly.', 20);
        return;
      }

      if (data.type === 'compile-success') {
        armTimeout(5000, 'TIME LIMIT EXCEEDED: program berjalan lebih dari 5 detik. Periksa kemungkinan infinite loop.');
        if (mode === 'run') {
          showLoading('Menjalankan program...', 'Program dieksekusi pada worker WebAssembly.', 75);
        }
        return;
      }

      if (data.type === 'test-case-start') {
        armTimeout(5000, 'TIME LIMIT EXCEEDED: test case berjalan lebih dari 5 detik. Periksa kemungkinan infinite loop.');
        showLoading('Pengujian ' + (data.index + 1) + '/' + data.total, data.message || 'Menjalankan test case...', 35 + ((data.index + 1) / data.total) * 60);
        return;
      }

      if (data.type === 'result' && !data.ok) {
        cancel(new Error(data.compileOutput || data.error || 'Kompilasi gagal. Compiler tidak menghasilkan modul WebAssembly.'));
        return;
      }

      if (data.type === 'stdin-result') {
        finish({
          stdout: data.stdout || '',
          stderr: data.stderr || '',
          runtimeError: data.runtimeError || '',
          compileOutput: data.compileOutput || ''
        });
        return;
      }

      if (data.type === 'mission-tests-result') {
        finish({
          tests: Array.isArray(data.tests) ? data.tests : [],
          compileOutput: data.compileOutput || ''
        });
      }
    };

    worker.onerror = event => {
      cancel(new Error(event.message || 'Compiler worker gagal dimuat. Periksa console browser untuk detail.'));
    };

    try {
      worker.postMessage({
        source,
        runMode: mode === 'run' ? 'stdin' : 'tests',
        standard: 'c++17',
        stdin: options.stdin || '',
        testCases: (options.tests || []).map(test => ({
          label: test.name,
          input: test.input || '',
          hidden: !!test.hidden
        }))
      });
    } catch (error) {
      cancel(error);
    }
  });
}

function parseLabel(output,label)function parseLabel(output,label) { const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const match=output.match(new RegExp(`^\\s*${escaped}\\s*:\\s*(.*?)\\s*$`,'mi'));return match?match[1].trim():null; }
function compareValue(actual,expected) { if(actual===null)return false;if(typeof expected==='number'){const value=Number(actual.replace(/,/g,'.'));return Number.isFinite(value)&&Math.abs(value-expected)<=0.011;}return actual.trim().toLowerCase()===String(expected).trim().toLowerCase(); }
function renderTests(rows,total) {
  const passed=rows.filter(row=>row.ok).length;$('#testResultCount').textContent=`${passed}/${total}`;
  $('#testsView').innerHTML=`<div class="result-summary ${passed===total?'pass':'fail'}"><div class="result-score">${passed}/${total}</div><div><strong>${passed===total?'Semua test berhasil':'Masih ada test gagal'}</strong><br><small>SUBMISSION TEST · ${total} TEST CASE</small></div></div>`+rows.map((row,i)=>`<details class="test-detail" ${i===0?'open':''}><summary><span>${escapeHTML(row.hidden?'Hidden test':row.name)}</span><b class="${row.ok?'pass':'fail'} status-inline">${icon(row.ok?'check':'x',12)}<span>${row.ok?'PASS':'FAIL'}</span></b></summary>${row.hidden?'':`<div class="check-list">${row.checks.map(c=>`<div class="check-line"><span>${escapeHTML(c.label)}</span><span class="${c.ok?'pass':'fail'} status-inline">${icon(c.ok?'check':'x',12)}<span>${escapeHTML(c.actual??'Label tidak ditemukan')}</span></span></div>`).join('')}</div><pre class="test-output">${escapeHTML(row.output||'(Tidak ada output)')}</pre>`}</details>`).join('');return passed;
}
async function execute(mode) {
  if (sessionStarted && (remainingSeconds() <= 0 || deadlineRemainingSeconds() <= 0)) updateTimer();
  if (!sessionStarted || sessionFinished || compileBusy) {
    toast('Sesi belum aktif, batas waktu telah tercapai, atau proses masih berjalan.', 'bad');
    return;
  }

  const source = getCode();
  if (!source.trim()) { toast('Editor masih kosong.', 'bad'); return; }
  if (!/\\bmain\\s*\\(/.test(source)) { toast('Program harus memiliki fungsi main().', 'bad'); return; }

  compileBusy = true;
  ['runBtn', 'checkTestsBtn', 'submitBtn'].forEach(id => { $('#' + id).disabled = true; });
  const started = performance.now();
  $('#runDuration').textContent = 'Compiling';

  try {
    if (mode === 'run') {
      showLoading('Mengompilasi C++17...', 'Menyiapkan Clang WebAssembly.', 15);
      const result = await runCompilerWorker(source, {
        mode: 'run',
        stdin: $('#stdinInput').value
      });
      hideLoading();

      const sections = [];
      if (result.stdout) sections.push(result.stdout);
      else sections.push('(Program selesai tanpa menghasilkan output.)');
      if (result.stderr) sections.push('[STDERR]\\n' + result.stderr);
      if (result.runtimeError) sections.push('[RUNTIME ERROR]\\n' + result.runtimeError);
      showOutput(sections.join('\\n\\n'), result.runtimeError ? 'error' : 'success');
      toast(result.runtimeError ? 'Program mengalami runtime error.' : 'Program berhasil dijalankan.', result.runtimeError ? 'bad' : 'good');
    } else {
      const currentTests = tasks[currentTask].tests;
      showLoading('Mengompilasi C++17...', 'Menyiapkan Clang WebAssembly.', 15);
      const result = await runCompilerWorker(source, {
        mode: 'tests',
        tests: currentTests
      });

      const rows = currentTests.map((test, index) => {
        const execution = result.tests[index] || {};
        const checks = test.checks.map(([label, expected]) => {
          const actual = execution.runtimeError
            ? 'RUNTIME ERROR: ' + execution.runtimeError
            : parseLabel(execution.stdout || '', label);
          return {
            label,
            expected,
            actual,
            ok: !execution.runtimeError && compareValue(actual, expected)
          };
        });
        const outputParts = [];
        if (execution.stdout) outputParts.push(execution.stdout);
        if (execution.stderr) outputParts.push('[STDERR]\\n' + execution.stderr);
        if (execution.runtimeError) outputParts.push('[RUNTIME ERROR]\\n' + execution.runtimeError);

        return {
          name: test.name,
          hidden: !!test.hidden,
          ok: checks.every(check => check.ok),
          checks,
          output: outputParts.join('\\n\\n') || '(Tidak ada output)'
        };
      });

      hideLoading();
      const total = currentTests.length;
      const passed = renderTests(rows, total);
      const score = total ? Math.round(passed / total * 100) : 0;
      lastSubmission = { task: tasks[currentTask].title, code: source, rows, passed, total, score };
      $('#scorePreview').textContent = passed + '/' + total + ' test lolos · Nilai ' + score + '/100';
      $('#submitBtn').disabled = false;
      showOutput(rows.map(row => row.hidden ? '[Hidden test] selesai' : row.output).join('\\n\\n'), passed === total ? 'success' : '');
      toast('Pengujian selesai: ' + passed + '/' + total + ' test lolos.', passed === total ? 'good' : 'bad');
    }

    $('#runDuration').textContent = Math.round(performance.now() - started) + ' ms';
  } catch (error) {
    hideLoading();
    showOutput(error.message || String(error), 'error');
    $('#runDuration').textContent = 'Compile / runtime error';
    toast('Program gagal dijalankan. Periksa terminal.', 'bad');
  } finally {
    compileBusy = false;
    const locked = !sessionStarted || sessionFinished;
    $('#runBtn').disabled = locked;
    $('#checkTestsBtn').disabled = locked;
    $('#submitBtn').disabled = locked || !lastSubmission || lastSubmission.task !== tasks[currentTask].title || lastSubmission.code !== getCode();
  }
}

function toBase64Url(text)function toBase64Url(text) { const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''); }
function jsonpRequest(parameters) {
  return new Promise((resolve,reject)=>{const callback=`__cppMission_${Date.now()}_${Math.random().toString(36).slice(2)}`;const script=document.createElement('script');const url=new URL(APPS_SCRIPT_URL);Object.entries(parameters).forEach(([k,v])=>url.searchParams.set(k,String(v)));url.searchParams.set('callback',callback);
    const timeout=setTimeout(()=>{cleanup();reject(new Error('Pengiriman timeout. Periksa koneksi atau deployment Apps Script.'));},30000);function cleanup(){clearTimeout(timeout);delete window[callback];script.remove();}
    window[callback]=result=>{cleanup();if(result?.ok)resolve(result);else reject(new Error(result?.message||'Apps Script menolak submission.'));};script.onerror=()=>{cleanup();reject(new Error('Tidak dapat menghubungi Google Apps Script.'));};script.src=url.toString();document.head.append(script);});
}
async function sendSubmission(payload) { const encoded=toBase64Url(JSON.stringify(payload));const chunks=encoded.match(/.{1,650}/g)||[''];const session=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}_${Math.random().toString(36).slice(2)}`).replace(/-/g,'');let result;for(let i=0;i<chunks.length;i++)result=await jsonpRequest({action:'chunk',session,index:i,total:chunks.length,data:chunks[i]});if(!result?.complete)throw new Error('Submission belum diterima lengkap.');return result; }
async function submitMission() {
  if (sessionStarted && (remainingSeconds() <= 0 || deadlineRemainingSeconds() <= 0)) updateTimer();
  if(!sessionStarted||sessionFinished){toast('Sesi belum aktif atau batas waktu pengerjaan telah berakhir.','bad');return;}
  const name=$('#studentName').value.trim();if(!name){toast('Isi nama lengkap siswa terlebih dahulu.','bad');$('#studentName').focus();return;}if(!lastSubmission||lastSubmission.code!==getCode()||lastSubmission.task!==tasks[currentTask].title){toast('Jalankan Check Tests kembali sebelum submit.','bad');return;}
  if(!APPS_SCRIPT_URL||APPS_SCRIPT_URL.includes('PASTE_APPS_SCRIPT')){toast('URL Apps Script belum diatur pada config.js.','bad');return;}
  const button=$('#submitBtn');button.disabled=true;button.innerHTML='<span class="button-spinner" aria-hidden="true"></span><span>Mengirim...</span>';
  try{
    const details=lastSubmission.rows.map(row=>({name:row.name,ok:row.ok,checks:row.checks}));
    const startedAtMs=Number(localStorage.getItem(START_KEY))||Date.now();
    const violationLog=getViolationLog();
    const submissionPayload={
      name,
      task:lastSubmission.task,
      code:lastSubmission.code,
      passed:lastSubmission.passed,
      total:lastSubmission.total||3,
      score:lastSubmission.score,
      details:JSON.stringify(details),
      submittedAtClient:new Date().toISOString(),
      startedAtMs,
      remainingSeconds:remainingSeconds(),
      elapsedSeconds:elapsedSessionSeconds(),
      violationCount:getViolationCount(),
      violations:JSON.stringify(violationLog)
    };
    const result=await sendSubmission(submissionPayload);
    progress.scores=progress.scores||{};progress.scores[tasks[currentTask].id]=lastSubmission.score;if(lastSubmission.score===100){progress.solved=Array.from(new Set([...(progress.solved||[]),tasks[currentTask].id]));}saveProgress();button.innerHTML=`${icon('checkCircle',14)}<span>Terkirim</span>`;toast(`Tugas berhasil dikirim. Nilai: ${result.score??lastSubmission.score}/100.`);
  }catch(error){button.disabled=false;button.innerHTML=`${icon('upload',14)}<span>Submit Mission</span>`;toast(error.message||'Pengiriman gagal.','bad');}
}
function clearConsole(){ $('#outputView').innerHTML=`<div class="empty-console"><span class="terminal-glyph">${icon('terminal',18)}</span><div><strong>Terminal output</strong><p>Jalankan kode.</p></div></div>`;$('#testsView').innerHTML=`<div class="empty-console"><span class="terminal-glyph">${icon('checkCircle',18)}</span><div><strong>Belum ada hasil test</strong></div></div>`;$('#testResultCount').textContent='—';$('#runDuration').textContent='';showConsole('output'); }
function showWarning(title,message){const modal=$('#clipboardWarningModal');$('#clipboardWarningTitle').textContent=title;$('#clipboardWarningMessage').textContent=message;modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');$('#clipboardWarningAcknowledge').focus();}
function closeWarning(){const modal=$('#clipboardWarningModal');modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');}
function initEditor(){
  editorCompartment=new Compartment();editor=new EditorView({doc:starterCode,parent:$('#editorHost'),extensions:[basicSetup,cpp(),oneDark,editorCompartment.of(EditorView.editable.of(false)),EditorView.theme({'&':{height:'100%',fontSize:'12px',backgroundColor:'#0b121c'},'.cm-scroller':{fontFamily:'DM Mono, Consolas, monospace',lineHeight:'1.7'},'.cm-content':{padding:'12px 0'},'.cm-line':{padding:'0 12px'},'.cm-gutters':{backgroundColor:'#0b121c',borderRight:'1px solid #1c2a3b',color:'#53667c'}}),EditorView.domEventHandlers({keydown(event,view){if(event.key==='Tab'){event.preventDefault();event.shiftKey?indentLess(view):indentMore(view);return true;}if((event.ctrlKey||event.metaKey)&&event.key==='/'){event.preventDefault();toggleComment(view);return true;}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveDraft();toast('Draft tersimpan di browser.');return true;}return false;}}),EditorView.updateListener.of(update=>{if(update.docChanged){saveDraft();lastSubmission=null;$('#submitBtn').disabled=true;$('#scorePreview').textContent='Kode berubah · Jalankan Check Tests kembali.';}if(update.docChanged||update.selectionSet)updateCursorInfo();})]});
  // Remove the plain-text fallback after CodeMirror mounts. Keeping both
  // siblings inside the flex editor host makes each consume half the width.
  $('#editorHost').classList.add('editor-ready');
  $('#codeFallback')?.remove();
}
const EDITOR_HEIGHT_KEY = 'cppMissionLab_editorHeight_v1';
function initEditorResizer() {
  const host = $('#editorHost');
  const handle = $('#editorResizeHandle');
  if (!host || !handle) return;
  const minHeight = 240;
  const maxHeight = () => Math.max(560, Math.min(1100, Math.floor(window.innerHeight * 0.9)));
  const clampHeight = value => Math.max(minHeight, Math.min(maxHeight(), Math.round(value)));
  const applyHeight = value => {
    const height = clampHeight(value);
    host.style.height = height + 'px';
    handle.setAttribute('aria-valuenow', String(height));
    handle.setAttribute('aria-valuemax', String(maxHeight()));
    editor?.requestMeasure();
    return height;
  };
  const saved = Number(localStorage.getItem(EDITOR_HEIGHT_KEY));
  if (Number.isFinite(saved) && saved >= minHeight) applyHeight(saved);
  else {
    const initial = Math.round(host.getBoundingClientRect().height || 360);
    handle.setAttribute('aria-valuenow', String(initial));
    handle.setAttribute('aria-valuemax', String(maxHeight()));
  }
  let drag = null;
  const stopDrag = event => {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', stopDrag);
    window.removeEventListener('pointercancel', stopDrag);
    handle.classList.remove('is-dragging');
    document.body.classList.remove('editor-resizing');
    localStorage.setItem(EDITOR_HEIGHT_KEY, String(Math.round(host.getBoundingClientRect().height)));
    drag = null;
  };
  const moveDrag = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    applyHeight(drag.startHeight + event.clientY - drag.startY);
  };
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag = {pointerId:event.pointerId,startY:event.clientY,startHeight:host.getBoundingClientRect().height};
    try { handle.setPointerCapture(event.pointerId); } catch (error) { /* Pointer capture may be unavailable in older browsers. */ }
    handle.classList.add('is-dragging');
    document.body.classList.add('editor-resizing');
    window.addEventListener('pointermove', moveDrag, {passive:false});
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
  });
  handle.addEventListener('keydown', event => {
    const current = host.getBoundingClientRect().height;
    const step = event.shiftKey ? 80 : 24;
    let next = current;
    if (event.key === 'ArrowDown') next = current + step;
    else if (event.key === 'ArrowUp') next = current - step;
    else if (event.key === 'Home') next = 360;
    else if (event.key === 'End') next = maxHeight();
    else return;
    event.preventDefault();
    const height = applyHeight(next);
    localStorage.setItem(EDITOR_HEIGHT_KEY, String(height));
  });
  window.addEventListener('resize', () => {
    handle.setAttribute('aria-valuemax', String(maxHeight()));
    if (host.style.height) applyHeight(Number.parseFloat(host.style.height));
  });
}
function bindEvents(){
  $('#startSessionForm').addEventListener('submit',submitStartSession);
  $('#startStudentName').addEventListener('input',()=>{
    $('#startSessionError').hidden=true;
    $('#startStudentName').removeAttribute('aria-invalid');
  });
  document.querySelectorAll('.challenge-item').forEach(button=>button.addEventListener('click',()=>renderTask(Number(button.dataset.task))));
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));['description','rubric','materials'].forEach(t=>$(`#${t}Tab`).classList.toggle('hidden',t!==button.dataset.tab));}));
  document.querySelectorAll('[data-console-tab]').forEach(button=>button.addEventListener('click',()=>showConsole(button.dataset.consoleTab)));
  $('#runBtn').addEventListener('click',()=>execute('run'));$('#checkTestsBtn').addEventListener('click',()=>execute('submit'));$('#submitBtn').addEventListener('click',submitMission);
  $('#resetCodeBtn').addEventListener('click',()=>{if(!sessionStarted||sessionFinished)return;if(confirm('Reset kode tugas ini ke template awal?')){setCode(starterCode);saveDraft();toast('Kode berhasil di-reset.');}});
  $('#useSampleInputBtn').addEventListener('click',()=>{$('#stdinInput').value=tasks[currentTask].sampleInput;showConsole('input');});$('#clearOutputBtn').addEventListener('click',clearConsole);
  $('#studentName').value=localStorage.getItem(NAME_KEY)||'';
  $('#clipboardWarningAcknowledge').addEventListener('click',closeWarning);$('#clipboardWarningModal').addEventListener('click',e=>{if(e.target.id==='clipboardWarningModal')closeWarning();});
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();execute('run');}
    if(!sessionStarted||sessionFinished||!RULES.penalizeSystemShortcuts)return;
    const key=String(event.key||'').toLowerCase();
    const screenshot=event.key==='PrintScreen'||((event.metaKey&&event.shiftKey)&&['s','3','4','5'].includes(key));
    const print=(event.ctrlKey||event.metaKey)&&key==='p';
    const devtools=event.key==='F12'||((event.ctrlKey||event.metaKey)&&event.shiftKey&&['i','j','c'].includes(key))||((event.ctrlKey||event.metaKey)&&key==='u');
    if(screenshot||print||devtools){
      event.preventDefault();event.stopPropagation();
      const reason=screenshot?'Mengambil screenshot menggunakan shortcut':print?'Mencoba mencetak halaman':'Membuka Developer Tools atau View Source';
      recordViolation(reason);
    }
  },true);
  const editorHost = $('#editorHost');
  ['copy','cut','paste'].forEach(type => editorHost.addEventListener(type, event => {
    if (!RULES.restrictClipboard || !sessionStarted || sessionFinished) return;
    event.preventDefault();event.stopPropagation();
    const label = type === 'copy' ? 'Menyalin kode' : type === 'cut' ? 'Memotong kode' : 'Menempelkan kode';
    recordViolation(label);
  }, true));
  editorHost.addEventListener('drop', event => {
    if (!RULES.restrictClipboard || !sessionStarted || sessionFinished) return;
    event.preventDefault();event.stopPropagation();
    recordViolation('Memasukkan kode melalui drag-and-drop');
  }, true);
  editorHost.addEventListener('dragover', event => {
    if (RULES.restrictClipboard && sessionStarted && !sessionFinished) event.preventDefault();
  }, true);
  const problemPanel = $('.problem-panel');
  // Focus the non-editable question surface when a student interacts with its text.
  problemPanel.addEventListener('pointerdown', event => {
    if (!event.target.closest('button')) problemPanel.focus({preventScroll:true});
  });
  // Text selection is disabled with CSS; this also blocks keyboard/context selection paths.
  problemPanel.addEventListener('selectstart', event => {
    if (RULES.restrictClipboard) event.preventDefault();
  }, true);
  problemPanel.addEventListener('contextmenu', event => {
    if (!RULES.penalizeContextMenu || !sessionStarted || sessionFinished) return;
    event.preventDefault();
    event.stopPropagation();
    recordViolation('Membuka menu konteks pada area soal');
  }, true);
  document.addEventListener('keydown', event => {
    if (!RULES.restrictClipboard || !sessionStarted || sessionFinished || !problemPanel.contains(document.activeElement)) return;
    const key = String(event.key || '').toLowerCase();
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      event.stopPropagation();
      recordViolation('Membuka menu konteks melalui keyboard pada area soal');
      return;
    }
    if ((event.ctrlKey || event.metaKey) && ['c','x','v','a'].includes(key) && !(event.shiftKey && key === 'c')) {
      event.preventDefault();
      event.stopPropagation();
      const action = key === 'c' ? 'Menyalin teks soal' : key === 'x' ? 'Memotong teks soal' : key === 'v' ? 'Menempelkan konten ke area soal' : 'Memilih seluruh teks soal';
      recordViolation(action);
    }
  }, true);
  // Catch clipboard actions even when the browser reports document/body as the event target.
  function selectionTouchesProblemPanel() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
    try {
      for (let i = 0; i < selection.rangeCount; i++) {
        if (selection.getRangeAt(i).intersectsNode(problemPanel)) return true;
      }
    } catch (error) { /* Ignore stale selection ranges. */ }
    return false;
  }
  ['copy','cut'].forEach(type => document.addEventListener(type, event => {
    if (!RULES.restrictClipboard || !sessionStarted || sessionFinished || !selectionTouchesProblemPanel()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    recordViolation(type === 'copy' ? 'Menyalin teks soal' : 'Memotong teks soal');
  }, true));
  let leftTab=false;document.addEventListener('visibilitychange',()=>{
    if(document.hidden){leftTab=Boolean(RULES.penalizeTabSwitch&&sessionStarted&&!sessionFinished);return;}
    if(leftTab){leftTab=false;recordViolation('Berpindah atau meninggalkan tab Mission Lab');}
  });
}

initEditor();initEditorResizer();bindEvents();renderProgress();renderTask(0);updateSessionLock();renderPenalty();
if(sessionStarted&&!sessionFinished){updateTimer();}
else if(sessionFinished)updateTimer();
else {openStartSessionModal();updateTimer();}
if(!sessionFinished)timerInterval=setInterval(updateTimer,1000);
