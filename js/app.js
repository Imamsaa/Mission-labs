import { basicSetup, EditorView } from 'codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentMore, indentLess, toggleComment } from '@codemirror/commands';
import { Compartment } from '@codemirror/state';

const $ = s => document.querySelector(s);
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

const SESSION_SECONDS = 90 * 60;
const START_KEY = 'cppMissionLab_sessionStart_v3';
const FINISHED_KEY = 'cppMissionLab_sessionFinished_v3';
const PENALTY_KEY = 'cppMissionLab_penaltySeconds_v1';
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
  {
    id: 'student-analytics', title: 'Student Analytics', subtitle: 'Bangun aplikasi pengolah nilai kelas, predikat, kelulusan, dan laporan statistik.', category: 'DATA PROCESSING & REPORTING', sampleInput: '3\nAndi Pratama\n90 80 90 100\nBudi Santoso\n70 70 70 90\nCitra Lestari\n80 90 100 75\n1\n0',
    brief: `<p class="problem-description">Wali kelas ingin mengolah nilai siswa secara otomatis. Program harus menerima data satu kelas, menghitung nilai akhir berbobot, menentukan predikat dan kelulusan, lalu menyediakan beberapa jenis laporan yang dapat dipilih berulang kali.</p>
      <div class="section-block"><h3>Komponen nilai akhir</h3><table class="task-table"><thead><tr><th>Komponen</th><th>Bobot</th></tr></thead><tbody><tr><td>Nilai Tugas</td><td>20%</td></tr><tr><td>Nilai PTS</td><td>30%</td></tr><tr><td>Nilai PAS</td><td>50%</td></tr></tbody></table><p>Rumus: <code>nilaiAkhir = tugas × 0.20 + PTS × 0.30 + PAS × 0.50</code>.</p></div>
      <div class="section-block"><h3>Ketentuan program</h3><ol><li>Minta jumlah siswa antara 1–30. Gunakan <code>while</code> untuk meminta ulang jika jumlah di luar rentang.</li><li>Gunakan <code>for</code> untuk memproses seluruh siswa.</li><li>Masukkan nama lengkap menggunakan <code>getline</code>. Atur perpindahan input menggunakan <code>cin.ignore()</code>.</li><li>Masukkan nilai Tugas, PTS, PAS, dan kehadiran (0–100). Gunakan <code>while</code> untuk memvalidasi semua rentang.</li><li>Hitung nilai akhir. Predikat A ≥90, B ≥80, C ≥70, D ≥60, dan E &lt;60.</li><li>Siswa lulus jika nilai akhir ≥75 <b>dan</b> kehadiran ≥80%. Gunakan operator logika.</li><li>Gunakan nested <code>if</code> untuk menentukan status. Hitung rata-rata kelas, nilai tertinggi, jumlah lulus, jumlah remedial, serta distribusi predikat.</li><li>Setelah semua data diproses, sediakan menu laporan berulang dengan <code>do-while</code> dan <code>switch-case</code>.</li></ol></div>
      <div class="callout"><b>Menu laporan</b><br>1 = Ringkasan kelas<br>2 = Distribusi predikat A–E<br>3 = Siswa terbaik dan persentase kelulusan<br>0 = Keluar dari menu</div>
      <div class="section-block"><h3>Format input</h3><pre class="sample-block">3                 // jumlah siswa
Andi Pratama      // nama lengkap
90 80 90 100      // tugas, PTS, PAS, kehadiran
Budi Santoso
70 70 70 90
Citra Lestari
80 90 100 75
1                 // pilih laporan ringkasan
0                 // keluar</pre><h3>Format laporan wajib</h3><b>Menu 1 – Ringkasan kelas</b><pre class="sample-block">Jumlah Siswa: 3
Rata-rata Kelas: 83.33
Nilai Tertinggi: 93.00
Siswa Lulus: 1
Siswa Remedial: 2</pre><b>Menu 2 – Distribusi predikat</b><pre class="sample-block">Predikat A: 1
Predikat B: 1
Predikat C: 1
Predikat D: 0
Predikat E: 0</pre><b>Menu 3 – Siswa terbaik</b><pre class="sample-block">Siswa Terbaik: Citra Lestari
Nilai Tertinggi: 93.00
Persentase Lulus: 33.33</pre><p class="hint">Prompt boleh berbeda. Label laporan harus sama. Gunakan <code>fixed</code> dan <code>setprecision(2)</code> untuk angka desimal.</p></div>`,
    rubric: `<h3>Rubrik penilaian · 100 poin</h3><div class="rubric-list"><div><span>getline, cin.ignore, dan validasi input</span><b>15</b></div><div><span>Perulangan for dan while</span><b>15</b></div><div><span>Nilai akhir berbobot, rata-rata, dan maksimum</span><b>20</b></div><div><span>Predikat, nested if, dan logika kelulusan</span><b>20</b></div><div><span>Menu do-while dan switch-case</span><b>15</b></div><div><span>Statistik dan format laporan</span><b>15</b></div></div><div class="callout">Nilai otomatis berasal dari 3 skenario input. Guru dapat meninjau kode untuk memeriksa cara siswa memproses data.</div>`,
    materials: `<h3>Materi yang harus tampak dalam kode</h3><ul><li>Variabel integer, double, string.</li><li><code>cin</code>, <code>cout</code>, <code>getline</code>, dan <code>cin.ignore()</code>.</li><li>Operator aritmatika, perbandingan, dan logika.</li><li><code>if / else if / else</code> dan nested <code>if</code>.</li><li><code>for</code> untuk pengolahan data siswa.</li><li><code>while</code> untuk validasi input.</li><li><code>do-while</code> dan <code>switch-case</code> untuk menu laporan.</li></ul><p class="hint">Array, vector, function, struct, dan pointer tidak diperlukan.</p>`,
    tests: [
      { name:'Test 1 · Ringkasan kelas', input:'3\nAndi Pratama\n90 80 90 100\nBudi Santoso\n70 70 70 90\nCitra Lestari\n80 90 100 75\n1\n0', checks:[['Jumlah Siswa',3],['Rata-rata Kelas',83.33],['Nilai Tertinggi',93],['Siswa Lulus',1],['Siswa Remedial',2]] },
      { name:'Test 2 · Distribusi predikat', input:'3\nDina Putri\n100 100 100 90\nEko Saputra\n80 70 60 100\nFina Aulia\n75 80 70 70\n2\n0', hidden:true, checks:[['Predikat A',1],['Predikat B',0],['Predikat C',1],['Predikat D',1],['Predikat E',0]] },
      { name:'Test 3 · Siswa terbaik', input:'2\nAmir Hakim\n90 90 80 85\nBella Zahra\n60 60 60 90\n3\n0', hidden:true, checks:[['Siswa Terbaik','Amir Hakim'],['Nilai Tertinggi',85],['Persentase Lulus',50]] },
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
function renderProgress() { const done=progress.solved.length;$('#solvedCount').textContent=done;$('#xpTotal').textContent=done*500;$('#progressPercent').textContent=`${done*50}%`;$('#progressBar').style.width=`${done*50}%`;tasks.forEach((task,i)=>{const el=$(`#done${i}`);if(el){const solved=progress.solved.includes(task.id);el.innerHTML=icon(solved?'checkCircle':'circle',15,solved?'is-done':'is-pending');el.setAttribute('aria-label',solved?'Selesai':'Belum selesai');}}); }
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
function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return minutes + ':' + seconds;
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
  $('#timerDisplay').textContent = formatClock(seconds);
  $('#timerDisplay').style.color = seconds === 0 ? '#ff8997' : '';
  renderPenalty();
  if (seconds <= 0 && sessionStarted) finishSession(true);
}
function recordViolation(reason) {
  if (!sessionStarted || sessionFinished) return false;
  const before = remainingSeconds();
  if (before <= 0) { finishSession(true); return false; }
  const totalPenalty = getPenaltySeconds() + 300;
  localStorage.setItem(PENALTY_KEY, String(totalPenalty));
  renderPenalty();
  updateTimer();
  const after = remainingSeconds();
  const message = 'Pelanggaran terdeteksi: ' + reason + '. Waktu dikurangi 5 menit. Sisa waktu: ' + formatClock(after) + '.';
  showWarning('Pelanggaran Aturan', message);
  toast('Pelanggaran dicatat · −05:00 · Sisa waktu ' + formatClock(after), 'bad');
  return true;
}
function finishSession(notify=true) {
  if(sessionFinished)return;sessionFinished=true;localStorage.setItem(FINISHED_KEY,'1');if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
  if(compileWorker)compileWorker.terminate();if(runtimeWorker)runtimeWorker.terminate();if(cancelActive)cancelActive(new Error('Waktu pengerjaan habis. Proses dibatalkan.'));
  updateSessionLock();if(notify)toast('Waktu pengerjaan habis. Semua tantangan dikunci.','bad');
}
function startSession() {
  if(sessionStarted||sessionFinished)return;localStorage.setItem(PENALTY_KEY,'0');renderPenalty();localStorage.setItem(START_KEY,String(Date.now()));sessionStarted=true;updateSessionLock();toast('Sesi dimulai. Waktu 90 menit berjalan.');
  updateTimer();timerInterval=setInterval(updateTimer,1000);
}
function updateSessionLock() {
  const preStart = !sessionStarted && !sessionFinished;
  const finished = sessionFinished;
  const locked = preStart || finished;
  $('#startTimerBtn').textContent = finished ? 'Waktu Habis' : preStart ? 'Mulai Sesi' : 'Sesi Aktif';
  $('#startTimerBtn').disabled = !preStart;
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
    : 'Baca tantangan dan rubrik terlebih dahulu. Editor akan terbuka setelah menekan Mulai Sesi.';
  $('#editorStatus').textContent = finished ? 'Sesi berakhir · Editor terkunci' : preStart ? 'Terkunci · Mulai sesi untuk coding' : 'Draft tersimpan';
  $('#editorHost').classList.toggle('session-locked', locked);
  updateTimer();
}
function showOutput(text,kind='') { $('#outputView').innerHTML=`<pre class="console-output ${kind}">${escapeHTML(text)}</pre>`;showConsole('output'); }
function showLoading(title,message,percent=15) { $('#loadingTitle').textContent=title;$('#loadingMessage').textContent=message;$('#loadingProgress').style.width=`${percent}%` ;$('#loadingOverlay').classList.remove('hidden'); }
function hideLoading() { $('#loadingOverlay').classList.add('hidden'); }
function compileSource(source) {
  return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./compiler-worker.js',import.meta.url),{type:'module'});compileWorker=worker;cancelActive=reject;
    const timeout=setTimeout(()=>{worker.terminate();compileWorker=null;cancelActive=null;reject(new Error('Compiler timeout. Periksa koneksi internet lalu coba lagi.'));},180000);
    worker.onmessage=e=>{clearTimeout(timeout);worker.terminate();compileWorker=null;cancelActive=null;const d=e.data||{};if(d.ok&&d.module)resolve(d.module);else reject(new Error(d.error||'Kompilasi gagal.'));};
    worker.onerror=e=>{clearTimeout(timeout);worker.terminate();compileWorker=null;cancelActive=null;reject(new Error(e.message||'Compiler worker gagal dimuat.'));};worker.postMessage({source});});
}
function runModule(module,input,limit=4000) {
  return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./runtime-worker.js',import.meta.url),{type:'module'});runtimeWorker=worker;cancelActive=reject;
    const timeout=setTimeout(()=>{worker.terminate();runtimeWorker=null;cancelActive=null;reject(new Error('TIME LIMIT EXCEEDED: program berjalan lebih dari 4 detik. Periksa kemungkinan infinite loop.'));},limit);
    worker.onmessage=e=>{clearTimeout(timeout);worker.terminate();runtimeWorker=null;cancelActive=null;const d=e.data||{};if(!d.ok)reject(new Error([d.error,d.stderr].filter(Boolean).join('\n')||'Runtime error'));else resolve({stdout:d.stdout||'',stderr:d.stderr||''});};
    worker.onerror=e=>{clearTimeout(timeout);worker.terminate();runtimeWorker=null;cancelActive=null;reject(new Error(e.message||'Runtime worker gagal.'));};worker.postMessage({module,input});});
}
async function getCompiled(source) { if(compiledSource===source&&compiledModule)return compiledModule;showLoading('Mengompilasi C++17...','Menyiapkan Clang WebAssembly.',20);compiledModule=await compileSource(source);compiledSource=source;return compiledModule; }
function parseLabel(output,label) { const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const match=output.match(new RegExp(`^\\s*${escaped}\\s*:\\s*(.*?)\\s*$`,'mi'));return match?match[1].trim():null; }
function compareValue(actual,expected) { if(actual===null)return false;if(typeof expected==='number'){const value=Number(actual.replace(/,/g,'.'));return Number.isFinite(value)&&Math.abs(value-expected)<=0.011;}return actual.trim().toLowerCase()===String(expected).trim().toLowerCase(); }
function renderTests(rows,total) {
  const passed=rows.filter(row=>row.ok).length;$('#testResultCount').textContent=`${passed}/${total}`;
  $('#testsView').innerHTML=`<div class="result-summary ${passed===total?'pass':'fail'}"><div class="result-score">${passed}/${total}</div><div><strong>${passed===total?'Semua test berhasil':'Masih ada test gagal'}</strong><br><small>SUBMISSION TEST · ${total} TEST CASE</small></div></div>`+rows.map((row,i)=>`<details class="test-detail" ${i===0?'open':''}><summary><span>${escapeHTML(row.hidden?'Hidden test':row.name)}</span><b class="${row.ok?'pass':'fail'} status-inline">${icon(row.ok?'check':'x',12)}<span>${row.ok?'PASS':'FAIL'}</span></b></summary>${row.hidden?'':`<div class="check-list">${row.checks.map(c=>`<div class="check-line"><span>${escapeHTML(c.label)}</span><span class="${c.ok?'pass':'fail'} status-inline">${icon(c.ok?'check':'x',12)}<span>${escapeHTML(c.actual??'Label tidak ditemukan')}</span></span></div>`).join('')}</div><pre class="test-output">${escapeHTML(row.output||'(Tidak ada output)')}</pre>`}</details>`).join('');return passed;
}
async function execute(mode) {
  if(!sessionStarted||sessionFinished||compileBusy){toast('Mulai sesi atau tunggu proses selesai.','bad');return;}
  const source=getCode();if(!source.trim()){toast('Editor masih kosong.','bad');return;}if(!/\bmain\s*\(/.test(source)){toast('Program harus memiliki fungsi main().','bad');return;}
  compileBusy=true;['runBtn','checkTestsBtn','submitBtn'].forEach(id=>$( '#' + id).disabled=true);const started=performance.now();$('#runDuration').textContent='Compiling';
  try {
    const module=await getCompiled(source);if(sessionFinished)throw new Error('Sesi terkunci. Proses dibatalkan.');
    if(mode==='run'){showLoading('Menjalankan program...','Program dieksekusi pada worker terpisah.',75);const result=await runModule(module,$('#stdinInput').value);hideLoading();showOutput((result.stdout||'(Program selesai tanpa output)')+(result.stderr?`\n[STDERR]\n${result.stderr}`:''),'success');toast('Program berhasil dijalankan.');}
    else {
      const rows=[];for(let i=0;i<tasks[currentTask].tests.length;i++){if(sessionFinished)throw new Error('Sesi terkunci. Pengujian dibatalkan.');const test=tasks[currentTask].tests[i];showLoading(`Pengujian ${i+1}/3`,test.hidden?'Menjalankan hidden test…':test.name,35+(i+1)/3*60);
        try{const result=await runModule(module,test.input);const checks=test.checks.map(([label,expected])=>{const actual=parseLabel(result.stdout,label);return{label,expected,actual,ok:compareValue(actual,expected)};});rows.push({name:test.name,hidden:!!test.hidden,ok:checks.every(c=>c.ok),checks,output:result.stdout});}
        catch(error){rows.push({name:test.name,hidden:!!test.hidden,ok:false,checks:test.checks.map(([label])=>({label,actual:error.message,ok:false})),output:error.message});}
      }
      hideLoading();const passed=renderTests(rows,3);const score=Math.round(passed/3*100);lastSubmission={task:tasks[currentTask].title,code:source,rows,passed,total:3,score};$('#scorePreview').textContent=`${passed}/3 test lolos · Nilai ${score}/100`;$('#submitBtn').disabled=false;showOutput(rows.map(r=>r.hidden?'[Hidden test] selesai':r.output).join('\n\n'),passed===3?'success':'');toast(`Pengujian selesai: ${passed}/3 test lolos.`,passed===3?'good':'bad');
    }
    $('#runDuration').textContent=`${Math.round(performance.now()-started)} ms`;
  } catch(error){hideLoading();showOutput(error.message||String(error),'error');$('#runDuration').textContent='Compile / runtime error';toast('Program gagal dijalankan. Periksa terminal.','bad');}
  finally {compileBusy=false;const locked=!sessionStarted||sessionFinished;$('#runBtn').disabled=locked;$('#checkTestsBtn').disabled=locked;$('#submitBtn').disabled=locked||!lastSubmission||lastSubmission.task!==tasks[currentTask].title||lastSubmission.code!==getCode();}
}
function toBase64Url(text) { const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''); }
function jsonpRequest(parameters) {
  return new Promise((resolve,reject)=>{const callback=`__cppMission_${Date.now()}_${Math.random().toString(36).slice(2)}`;const script=document.createElement('script');const url=new URL(APPS_SCRIPT_URL);Object.entries(parameters).forEach(([k,v])=>url.searchParams.set(k,String(v)));url.searchParams.set('callback',callback);
    const timeout=setTimeout(()=>{cleanup();reject(new Error('Pengiriman timeout. Periksa koneksi atau deployment Apps Script.'));},30000);function cleanup(){clearTimeout(timeout);delete window[callback];script.remove();}
    window[callback]=result=>{cleanup();if(result?.ok)resolve(result);else reject(new Error(result?.message||'Apps Script menolak submission.'));};script.onerror=()=>{cleanup();reject(new Error('Tidak dapat menghubungi Google Apps Script.'));};script.src=url.toString();document.head.append(script);});
}
async function sendSubmission(payload) { const encoded=toBase64Url(JSON.stringify(payload));const chunks=encoded.match(/.{1,650}/g)||[''];const session=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}_${Math.random().toString(36).slice(2)}`).replace(/-/g,'');let result;for(let i=0;i<chunks.length;i++)result=await jsonpRequest({action:'chunk',session,index:i,total:chunks.length,data:chunks[i]});if(!result?.complete)throw new Error('Submission belum diterima lengkap.');return result; }
async function submitMission() {
  if(!sessionStarted||sessionFinished||remainingSeconds()<=0){if(sessionStarted&&remainingSeconds()<=0)finishSession();toast('Sesi belum aktif atau sudah berakhir.','bad');return;}
  const name=$('#studentName').value.trim();if(!name){toast('Isi nama lengkap siswa terlebih dahulu.','bad');$('#studentName').focus();return;}if(!lastSubmission||lastSubmission.code!==getCode()||lastSubmission.task!==tasks[currentTask].title){toast('Jalankan Check Tests kembali sebelum submit.','bad');return;}
  if(!APPS_SCRIPT_URL||APPS_SCRIPT_URL.includes('PASTE_APPS_SCRIPT')){toast('URL Apps Script belum diatur pada config.js.','bad');return;}
  const button=$('#submitBtn');button.disabled=true;button.innerHTML='<span class="button-spinner" aria-hidden="true"></span><span>Mengirim...</span>';
  try{const details=lastSubmission.rows.map(row=>({name:row.name,ok:row.ok,checks:row.checks}));const result=await sendSubmission({name,task:lastSubmission.task,code:lastSubmission.code,passed:lastSubmission.passed,total:3,score:lastSubmission.score,details:JSON.stringify(details)});
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
function bindEvents(){
  $('#startTimerBtn').addEventListener('click',startSession);
  document.querySelectorAll('.challenge-item').forEach(button=>button.addEventListener('click',()=>renderTask(Number(button.dataset.task))));
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));['description','rubric','materials'].forEach(t=>$(`#${t}Tab`).classList.toggle('hidden',t!==button.dataset.tab));}));
  document.querySelectorAll('[data-console-tab]').forEach(button=>button.addEventListener('click',()=>showConsole(button.dataset.consoleTab)));
  $('#runBtn').addEventListener('click',()=>execute('run'));$('#checkTestsBtn').addEventListener('click',()=>execute('submit'));$('#submitBtn').addEventListener('click',submitMission);
  $('#resetCodeBtn').addEventListener('click',()=>{if(!sessionStarted||sessionFinished)return;if(confirm('Reset kode tugas ini ke template awal?')){setCode(starterCode);saveDraft();toast('Kode berhasil di-reset.');}});
  $('#useSampleInputBtn').addEventListener('click',()=>{$('#stdinInput').value=tasks[currentTask].sampleInput;showConsole('input');});$('#clearOutputBtn').addEventListener('click',clearConsole);
  $('#studentName').value=localStorage.getItem(NAME_KEY)||'';$('#studentName').addEventListener('input',()=>localStorage.setItem(NAME_KEY,$('#studentName').value));
  $('#clipboardWarningAcknowledge').addEventListener('click',closeWarning);$('#clipboardWarningModal').addEventListener('click',e=>{if(e.target.id==='clipboardWarningModal')closeWarning();});
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();execute('run');}
    if(!sessionStarted||sessionFinished)return;
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
    if (!sessionStarted || sessionFinished) return;
    event.preventDefault();event.stopPropagation();
    const label = type === 'copy' ? 'Menyalin kode' : type === 'cut' ? 'Memotong kode' : 'Menempelkan kode';
    recordViolation(label);
  }, true));
  editorHost.addEventListener('drop', event => {
    if (!sessionStarted || sessionFinished) return;
    event.preventDefault();event.stopPropagation();
    recordViolation('Memasukkan kode melalui drag-and-drop');
  }, true);
  editorHost.addEventListener('dragover', event => {
    if (sessionStarted && !sessionFinished) event.preventDefault();
  }, true);
  const problemPanel = $('.problem-panel');
  // Focus the non-editable question surface when a student interacts with its text.
  problemPanel.addEventListener('pointerdown', event => {
    if (!event.target.closest('button')) problemPanel.focus({preventScroll:true});
  });
  // Text selection is disabled with CSS; this also blocks keyboard/context selection paths.
  problemPanel.addEventListener('selectstart', event => {
    event.preventDefault();
  }, true);
  problemPanel.addEventListener('contextmenu', event => {
    if (!sessionStarted || sessionFinished) return;
    event.preventDefault();
    event.stopPropagation();
    recordViolation('Membuka menu konteks pada area soal');
  }, true);
  document.addEventListener('keydown', event => {
    if (!sessionStarted || sessionFinished || !problemPanel.contains(document.activeElement)) return;
    const key = String(event.key || '').toLowerCase();
    if ((event.ctrlKey || event.metaKey) && ['c','x','v','a'].includes(key)) {
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
    if (!sessionStarted || sessionFinished || !selectionTouchesProblemPanel()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    recordViolation(type === 'copy' ? 'Menyalin teks soal' : 'Memotong teks soal');
  }, true));
  let leftTab=false;document.addEventListener('visibilitychange',()=>{
    if(document.hidden){leftTab=sessionStarted&&!sessionFinished;return;}
    if(leftTab){leftTab=false;recordViolation('Berpindah atau meninggalkan tab Mission Lab');}
  });
}

initEditor();bindEvents();renderProgress();renderTask(0);updateSessionLock();renderPenalty();
if(sessionStarted&&!sessionFinished){updateTimer();timerInterval=setInterval(updateTimer,1000);}else if(sessionFinished)updateTimer();
