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

const SESSION_SECONDS = Math.max(1, Number(RULES.sessionMinutes) || 60) * 60;
const START_KEY = 'cppMissionLab_sessionStart_v3';
const FINISHED_KEY = 'cppMissionLab_sessionFinished_v3';
const PENALTY_KEY = 'cppMissionLab_penaltySeconds_v1';
const VIOLATION_COUNT_KEY = 'cppMissionLab_violationCount_v1';
const VIOLATION_LOG_KEY = 'cppMissionLab_violationLog_v1';
const AUTO_PENDING_KEY = 'cppMissionLab_autoSubmissionPending_v1';
const SENT_PREFIX = 'cppMissionLab_sent_';
const PROGRESS_KEY = 'cppMissionLab_progress_v3';
const DRAFT_PREFIX = 'cppMissionLab_draft_v1_';
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

const tasks = [{"id":"smart-canteen","title":"Smart Canteen","subtitle":"Program kasir multi-pelanggan dengan array, laporan, diskon bertingkat, dan menu interaktif.","category":"TRANSAKSI & LOGIKA","difficulty":"HARD","brief":"<p class=\"problem-description\">Kantin sekolah ingin memiliki program kasir yang dapat mencatat beberapa pesanan pelanggan dalam satu sesi. Setiap pelanggan dapat memesan produk berbeda dan membayar dengan cara berbeda.</p><div class=\"callout\"><b>Misi:</b> Buat program kasir untuk maksimal 5 pelanggan. Hitung harga, diskon, admin, dan total pembayaran setiap pelanggan, lalu tampilkan ringkasan seluruh pesanan.</div>\n<div class=\"section-block\"><h3>1. Data yang dimasukkan</h3><p>Masukkan jumlah data terlebih dahulu (1–5). Setelah menu muncul, pilih <b>1</b> untuk mengisi data. Masukkan data sesuai urutan. Nama, kelas, dan judul yang memiliki spasi harus terbaca sebagai satu teks utuh, bukan terpotong pada spasi pertama.</p>\n<div class=\"callout\"><b>Data setiap peserta/pelanggan:</b><ol><li>Nama lengkap pelanggan.</li><li>Kelas pelanggan.</li><li>Status member: 1 = member, 0 = bukan member.</li><li>Kode produk: 1 = Nasi Goreng, 2 = Roti Bakar, 3 = Jus Buah, 4 = Air Mineral.</li><li>Jumlah barang (1–20).</li><li>Metode pembayaran: 1 = tunai, 2 = QRIS.</li></ol></div><p>Program harus menggunakan menu yang dapat dipilih berulang kali sampai pengguna memilih Keluar.</p>\n<div class=\"callout\"><b>Menu wajib:</b><ol><li>Input Data</li><li>Laporan</li><li>Ringkasan</li><li>Petunjuk</li><li>Keluar</li></ol></div>\n<p>Jumlah data diminta di awal dan harus diulang sampai nilainya 1–5. Setelah itu, menu ditampilkan. Menu 1 mengisi data; menu 2 dan 3 menampilkan laporan serta ringkasan.</p></div>\n<div class=\"section-block\"><h3>2. Aturan pengolahan data</h3><ul><li>Harga produk: Nasi Goreng Rp12.000, Roti Bakar Rp8.000, Jus Buah Rp6.000, Air Mineral Rp4.000.</li><li>Subtotal = harga produk × jumlah barang.</li><li>Member: subtotal ≥ Rp50.000 diskon 15%; jika ≥ Rp25.000 diskon 10%; selain itu 0%.</li><li>Bukan member: subtotal ≥ Rp100.000 diskon 10%; jika ≥ Rp50.000 diskon 5%; selain itu 0%.</li><li>Tunai tidak dikenai admin. QRIS dikenai admin 1% dari subtotal setelah diskon.</li><li>Total Bayar = Subtotal − Diskon + Biaya Admin. Produk, jumlah, status, atau pembayaran yang tidak sesuai pilihan ditandai DATA TIDAK VALID dan tidak dihitung.</li></ul></div>\n<div class=\"section-block\"><h3>3. Susunan program yang wajib digunakan</h3><ul>\n<li><b>Array:</b> gunakan array sejajar dengan kapasitas maksimal 5 data untuk menyimpan seluruh informasi.</li>\n<li><b>Function minimal:</b> buat <code>inputData()</code>, <code>hitungHasil(int indeks)</code>, <code>tentukanStatus(int indeks)</code>, <code>tampilkanLaporan()</code>, dan <code>tampilkanRingkasan()</code>. Kamu boleh menambah parameter atau fungsi pendukung bila diperlukan.</li>\n<li><b>Scope:</b> konstanta kapasitas, array, dan jumlah data dibuat global. Variabel indeks, pilihan menu, dan hasil sementara dibuat lokal di dalam fungsi.</li>\n<li><b>Object string:</b> gunakan <code>length()</code>, <code>find(\" \")</code>, <code>substr()</code>, dan <code>append()</code> dalam laporan nama.</li>\n<li><b>Looping:</b> <code>do-while</code> untuk validasi jumlah data; <code>while</code> untuk mengulang menu; <code>for</code> untuk membaca dan menampilkan array.</li>\n<li><b>Percabangan:</b> <code>switch-case</code> untuk menu 1–5, setiap case diakhiri <code>break</code>, dan if bersarang untuk menentukan status.</li>\n<li>Gunakan <code>getline()</code> untuk membaca nama/teks yang mengandung spasi, termasuk setelah input angka.</li>\n</ul></div><div class=\"callout\"><b>Batasan:</b> Jangan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan. Gunakan <code>&lt;iostream&gt;</code> dan <code>&lt;string&gt;</code> saja.</div>\n<div class=\"section-block\"><h3>4. Ringkasan yang harus ditampilkan</h3><p>Tampilkan nama label dengan ejaan yang sama persis. Angka ini adalah hasil untuk input standar yang sudah disediakan di panel STDIN.</p><pre class=\"brief-code\">Jumlah Pesanan: 3\nTotal Barang: 14\nTotal Diskon: 12000\nTotal Admin: 590\nTotal Penjualan: 110590</pre><p class=\"brief-note\">Menu Laporan harus menampilkan semua data satu per satu, termasuk teks lengkap, kelas/lokasi, kata pertama (jika tidak ada spasi gunakan teks utuh), jumlah karakter, hasil perhitungan, dan status. Susun label laporan menggunakan method append().</p></div>\n<div class=\"section-block\"><h3>5. Pengujian</h3><ul><li>Pastikan seluruh data yang dimasukkan diproses, bukan hanya data pertama.</li><li>Uji kondisi yang berhasil dan kondisi yang tidak memenuhi syarat.</li><li>Menu harus muncul kembali setelah Input Data, Laporan, Ringkasan, atau Petunjuk selesai.</li><li>Program hanya berhenti ketika menu Keluar dipilih.</li></ul></div>","rubric":"<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\">\n <div><span>Array sejajar dan input data</span><b>20</b></div>\n <div><span>Function dan pembagian scope</span><b>15</b></div>\n <div><span>Menu while, switch-case, do-while, dan for</span><b>20</b></div>\n <div><span>Perhitungan dan validasi aturan</span><b>20</b></div>\n <div><span>if bersarang dan operator logika</span><b>15</b></div>\n <div><span>Object string, method, dan laporan</span><b>10</b></div></div>","materials":"<h3>Materi yang dilatih</h3><ul>\n <li>Array sejajar serta variabel global dan lokal (scope).</li>\n <li>Function untuk input, perhitungan, penentuan status, laporan, dan ringkasan.</li>\n <li>Object <code>string</code>: <code>length()</code>, <code>find()</code>, <code>substr()</code>, dan <code>append()</code>.</li>\n <li><code>getline()</code> untuk membaca nama atau teks yang mengandung spasi.</li>\n <li><code>while</code>, <code>do-while</code>, <code>for</code>, dan <code>switch-case</code>.</li>\n <li>if/else, if bersarang, operator perbandingan, dan operator logika.</li></ul>","tests":[{"name":"Tiga pesanan berbeda","input":"3\n1\nFadli Akbar\n8A\n1\n1\n5\n1\nNisa Putri\n8B\n0\n2\n4\n2\nBima Pratama\n8A\n1\n3\n5\n2\n2\n3\n5","hidden":false,"checks":[["Jumlah Pesanan",3],["Total Barang",14],["Total Diskon",12000],["Total Admin",590],["Total Penjualan",110590]]},{"name":"Batas diskon dan admin","input":"2\n1\nAlya Safitri\n8C\n0\n4\n5\n2\nDoni Saputra\n8A\n1\n1\n5\n1\n2\n3\n5","hidden":true,"checks":[["Jumlah Pesanan",2],["Total Barang",10],["Total Diskon",9000],["Total Admin",200],["Total Penjualan",71200]]},{"name":"Produk tidak dikenal","input":"0\n2\n1\nRani Putri\n8B\n1\n9\n2\n1\nRudi Hartono\n8A\n0\n4\n3\n1\n2\n3\n5","hidden":true,"checks":[["Jumlah Pesanan",1],["Total Barang",3],["Total Diskon",0],["Total Admin",0],["Total Penjualan",12000]]}]},{"id":"smart-parking","title":"Smart Parking Gate","subtitle":"Kelola beberapa kendaraan dengan tarif, biaya tambahan, diskon member, dan laporan parkir.","category":"PERCABANGAN & SWITCH","difficulty":"HARD","brief":"<p class=\"problem-description\">Petugas parkir sekolah ingin mengganti pencatatan manual dengan program. Program menerima data beberapa kendaraan, menghitung tagihan, dan menampilkan ringkasan pendapatan parkir.</p><div class=\"callout\"><b>Misi:</b> Buat sistem parkir untuk maksimal 5 kendaraan. Setiap kendaraan memiliki jenis, lama parkir, dan status member.</div>\n<div class=\"section-block\"><h3>1. Data yang dimasukkan</h3><p>Masukkan jumlah data terlebih dahulu (1–5). Setelah menu muncul, pilih <b>1</b> untuk mengisi data. Masukkan data sesuai urutan. Nama, kelas, dan judul yang memiliki spasi harus terbaca sebagai satu teks utuh, bukan terpotong pada spasi pertama.</p>\n<div class=\"callout\"><b>Data setiap peserta/pelanggan:</b><ol><li>Nama pemilik kendaraan.</li><li>Kelas pemilik kendaraan.</li><li>Jenis kendaraan: 1 = motor, 2 = mobil, 3 = bus.</li><li>Lama parkir dalam jam (1–24).</li><li>Status member: 1 = member, 0 = bukan member.</li></ol></div><p>Program harus menggunakan menu yang dapat dipilih berulang kali sampai pengguna memilih Keluar.</p>\n<div class=\"callout\"><b>Menu wajib:</b><ol><li>Input Data</li><li>Laporan</li><li>Ringkasan</li><li>Petunjuk</li><li>Keluar</li></ol></div>\n<p>Jumlah data diminta di awal dan harus diulang sampai nilainya 1–5. Setelah itu, menu ditampilkan. Menu 1 mengisi data; menu 2 dan 3 menampilkan laporan serta ringkasan.</p></div>\n<div class=\"section-block\"><h3>2. Aturan pengolahan data</h3><ul><li>Tarif per jam: motor Rp2.000, mobil Rp5.000, bus Rp8.000.</li><li>Biaya Dasar = tarif per jam × lama parkir.</li><li>Jika parkir lebih dari 4 jam, Biaya Tambahan Rp5.000. Jika 4 jam atau kurang, biaya tambahan 0.</li><li>Member mendapat diskon 10% dari Biaya Dasar jika Biaya Dasar minimal Rp20.000. Bukan member tidak mendapat diskon.</li><li>Total Bayar = Biaya Dasar + Biaya Tambahan − Diskon.</li><li>Jenis kendaraan harus 1–3, lama parkir 1–24 jam, dan status member harus 0 atau 1.</li></ul></div>\n<div class=\"section-block\"><h3>3. Susunan program yang wajib digunakan</h3><ul>\n<li><b>Array:</b> gunakan array sejajar dengan kapasitas maksimal 5 data untuk menyimpan seluruh informasi.</li>\n<li><b>Function minimal:</b> buat <code>inputData()</code>, <code>hitungHasil(int indeks)</code>, <code>tentukanStatus(int indeks)</code>, <code>tampilkanLaporan()</code>, dan <code>tampilkanRingkasan()</code>. Kamu boleh menambah parameter atau fungsi pendukung bila diperlukan.</li>\n<li><b>Scope:</b> konstanta kapasitas, array, dan jumlah data dibuat global. Variabel indeks, pilihan menu, dan hasil sementara dibuat lokal di dalam fungsi.</li>\n<li><b>Object string:</b> gunakan <code>length()</code>, <code>find(\" \")</code>, <code>substr()</code>, dan <code>append()</code> dalam laporan nama.</li>\n<li><b>Looping:</b> <code>do-while</code> untuk validasi jumlah data; <code>while</code> untuk mengulang menu; <code>for</code> untuk membaca dan menampilkan array.</li>\n<li><b>Percabangan:</b> <code>switch-case</code> untuk menu 1–5, setiap case diakhiri <code>break</code>, dan if bersarang untuk menentukan status.</li>\n<li>Gunakan <code>getline()</code> untuk membaca nama/teks yang mengandung spasi, termasuk setelah input angka.</li>\n</ul></div><div class=\"callout\"><b>Batasan:</b> Jangan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan. Gunakan <code>&lt;iostream&gt;</code> dan <code>&lt;string&gt;</code> saja.</div>\n<div class=\"section-block\"><h3>4. Ringkasan yang harus ditampilkan</h3><p>Tampilkan nama label dengan ejaan yang sama persis. Angka ini adalah hasil untuk input standar yang sudah disediakan di panel STDIN.</p><pre class=\"brief-code\">Jumlah Kendaraan: 3\nJumlah Member: 1\nTotal Biaya Dasar: 93000\nTotal Diskon: 2500\nTotal Pendapatan: 100500</pre><p class=\"brief-note\">Menu Laporan harus menampilkan semua data satu per satu, termasuk teks lengkap, kelas/lokasi, kata pertama (jika tidak ada spasi gunakan teks utuh), jumlah karakter, hasil perhitungan, dan status. Susun label laporan menggunakan method append().</p></div>\n<div class=\"section-block\"><h3>5. Pengujian</h3><ul><li>Pastikan seluruh data yang dimasukkan diproses, bukan hanya data pertama.</li><li>Uji kondisi yang berhasil dan kondisi yang tidak memenuhi syarat.</li><li>Menu harus muncul kembali setelah Input Data, Laporan, Ringkasan, atau Petunjuk selesai.</li><li>Program hanya berhenti ketika menu Keluar dipilih.</li></ul></div>","rubric":"<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\">\n <div><span>Array sejajar dan input data</span><b>20</b></div>\n <div><span>Function dan pembagian scope</span><b>15</b></div>\n <div><span>Menu while, switch-case, do-while, dan for</span><b>20</b></div>\n <div><span>Perhitungan dan validasi aturan</span><b>20</b></div>\n <div><span>if bersarang dan operator logika</span><b>15</b></div>\n <div><span>Object string, method, dan laporan</span><b>10</b></div></div>","materials":"<h3>Materi yang dilatih</h3><ul>\n <li>Array sejajar serta variabel global dan lokal (scope).</li>\n <li>Function untuk input, perhitungan, penentuan status, laporan, dan ringkasan.</li>\n <li>Object <code>string</code>: <code>length()</code>, <code>find()</code>, <code>substr()</code>, dan <code>append()</code>.</li>\n <li><code>getline()</code> untuk membaca nama atau teks yang mengandung spasi.</li>\n <li><code>while</code>, <code>do-while</code>, <code>for</code>, dan <code>switch-case</code>.</li>\n <li>if/else, if bersarang, operator perbandingan, dan operator logika.</li></ul>","tests":[{"name":"Motor, mobil, dan bus","input":"3\n1\nFadli Akbar\n8A\n1\n2\n0\nNisa Putri\n8B\n2\n5\n1\nBima Pratama\n8A\n3\n8\n0\n2\n3\n5","hidden":false,"checks":[["Jumlah Kendaraan",3],["Jumlah Member",1],["Total Biaya Dasar",93000],["Total Diskon",2500],["Total Pendapatan",100500]]},{"name":"Member dan parkir lama","input":"2\n1\nSiti Aminah\n8C\n2\n6\n1\nDoni Saputra\n8A\n1\n4\n1\n2\n3\n5","hidden":true,"checks":[["Jumlah Kendaraan",2],["Jumlah Member",2],["Total Biaya Dasar",38000],["Total Diskon",3000],["Total Pendapatan",40000]]},{"name":"Durasi minimum dan maksimum","input":"0\n2\n1\nRani Putri\n8B\n1\n1\n0\nRudi Hartono\n8A\n3\n24\n0\n2\n3\n5","hidden":true,"checks":[["Jumlah Kendaraan",2],["Jumlah Member",0],["Total Biaya Dasar",194000],["Total Diskon",0],["Total Pendapatan",199000]]}]},{"id":"academic-report","title":"Rekap Nilai Akademik","subtitle":"Kelola nilai beberapa siswa dengan array, bobot penilaian, kategori, dan keputusan remedial.","category":"PERULANGAN & LOGIKA","difficulty":"HARD","brief":"<p class=\"problem-description\">Guru ingin membuat program untuk mengolah nilai sejumlah siswa sekaligus. Nilai berasal dari latihan, ujian, dan proyek. Program harus menghasilkan laporan lengkap dan ringkasan kelas.</p><div class=\"callout\"><b>Misi:</b> Buat program rekap akademik untuk maksimal 5 siswa. Hitung rata-rata latihan, nilai akhir berbobot, predikat, dan status kelulusan.</div>\n<div class=\"section-block\"><h3>1. Data yang dimasukkan</h3><p>Masukkan jumlah data terlebih dahulu (1–5). Setelah menu muncul, pilih <b>1</b> untuk mengisi data. Masukkan data sesuai urutan. Nama, kelas, dan judul yang memiliki spasi harus terbaca sebagai satu teks utuh, bukan terpotong pada spasi pertama.</p>\n<div class=\"callout\"><b>Data setiap peserta/pelanggan:</b><ol><li>Nama lengkap siswa.</li><li>Kelas siswa.</li><li>Lima nilai latihan (masing-masing 0–100).</li><li>Nilai ujian (0–100).</li><li>Nilai proyek (0–100).</li><li>Persentase kehadiran (0–100).</li></ol></div><p>Program harus menggunakan menu yang dapat dipilih berulang kali sampai pengguna memilih Keluar.</p>\n<div class=\"callout\"><b>Menu wajib:</b><ol><li>Input Data</li><li>Laporan</li><li>Ringkasan</li><li>Petunjuk</li><li>Keluar</li></ol></div>\n<p>Jumlah data diminta di awal dan harus diulang sampai nilainya 1–5. Setelah itu, menu ditampilkan. Menu 1 mengisi data; menu 2 dan 3 menampilkan laporan serta ringkasan.</p></div>\n<div class=\"section-block\"><h3>2. Aturan pengolahan data</h3><ul><li>Rata-rata Latihan = jumlah lima nilai latihan dibagi 5.</li><li>Nilai Akhir = Rata-rata Latihan × 20% + Nilai Ujian × 35% + Nilai Proyek × 45%.</li><li>Predikat A jika nilai akhir ≥90; B jika ≥80; C jika ≥70; D jika ≥60; selain itu E.</li><li>Status LULUS hanya jika Nilai Akhir ≥75 dan kehadiran ≥80. Gunakan if bersarang untuk menentukan LULUS, REMEDIAL NILAI, atau PERBAIKI KEHADIRAN.</li><li>Nilai rata-rata dan nilai akhir dapat berupa pecahan. Semua nilai masukan harus berada pada rentang 0–100.</li></ul></div>\n<div class=\"section-block\"><h3>3. Susunan program yang wajib digunakan</h3><ul>\n<li><b>Array:</b> gunakan array sejajar dengan kapasitas maksimal 5 data untuk menyimpan seluruh informasi.</li>\n<li><b>Function minimal:</b> buat <code>inputData()</code>, <code>hitungHasil(int indeks)</code>, <code>tentukanStatus(int indeks)</code>, <code>tampilkanLaporan()</code>, dan <code>tampilkanRingkasan()</code>. Kamu boleh menambah parameter atau fungsi pendukung bila diperlukan.</li>\n<li><b>Scope:</b> konstanta kapasitas, array, dan jumlah data dibuat global. Variabel indeks, pilihan menu, dan hasil sementara dibuat lokal di dalam fungsi.</li>\n<li><b>Object string:</b> gunakan <code>length()</code>, <code>find(\" \")</code>, <code>substr()</code>, dan <code>append()</code> dalam laporan nama.</li>\n<li><b>Looping:</b> <code>do-while</code> untuk validasi jumlah data; <code>while</code> untuk mengulang menu; <code>for</code> untuk membaca dan menampilkan array.</li>\n<li><b>Percabangan:</b> <code>switch-case</code> untuk menu 1–5, setiap case diakhiri <code>break</code>, dan if bersarang untuk menentukan status.</li>\n<li>Gunakan <code>getline()</code> untuk membaca nama/teks yang mengandung spasi, termasuk setelah input angka.</li>\n</ul></div><div class=\"callout\"><b>Batasan:</b> Jangan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan. Gunakan <code>&lt;iostream&gt;</code> dan <code>&lt;string&gt;</code> saja.</div>\n<div class=\"section-block\"><h3>4. Ringkasan yang harus ditampilkan</h3><p>Tampilkan nama label dengan ejaan yang sama persis. Angka ini adalah hasil untuk input standar yang sudah disediakan di panel STDIN.</p><pre class=\"brief-code\">Jumlah Siswa: 3\nJumlah Lulus: 1\nJumlah Remedial Nilai: 1\nRata-rata Nilai Akhir: 79.48</pre><p class=\"brief-note\">Menu Laporan harus menampilkan semua data satu per satu, termasuk teks lengkap, kelas/lokasi, kata pertama (jika tidak ada spasi gunakan teks utuh), jumlah karakter, hasil perhitungan, dan status. Susun label laporan menggunakan method append().</p></div>\n<div class=\"section-block\"><h3>5. Pengujian</h3><ul><li>Pastikan seluruh data yang dimasukkan diproses, bukan hanya data pertama.</li><li>Uji kondisi yang berhasil dan kondisi yang tidak memenuhi syarat.</li><li>Menu harus muncul kembali setelah Input Data, Laporan, Ringkasan, atau Petunjuk selesai.</li><li>Program hanya berhenti ketika menu Keluar dipilih.</li></ul></div>","rubric":"<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\">\n <div><span>Array sejajar dan input data</span><b>20</b></div>\n <div><span>Function dan pembagian scope</span><b>15</b></div>\n <div><span>Menu while, switch-case, do-while, dan for</span><b>20</b></div>\n <div><span>Perhitungan dan validasi aturan</span><b>20</b></div>\n <div><span>if bersarang dan operator logika</span><b>15</b></div>\n <div><span>Object string, method, dan laporan</span><b>10</b></div></div>","materials":"<h3>Materi yang dilatih</h3><ul>\n <li>Array sejajar serta variabel global dan lokal (scope).</li>\n <li>Function untuk input, perhitungan, penentuan status, laporan, dan ringkasan.</li>\n <li>Object <code>string</code>: <code>length()</code>, <code>find()</code>, <code>substr()</code>, dan <code>append()</code>.</li>\n <li><code>getline()</code> untuk membaca nama atau teks yang mengandung spasi.</li>\n <li><code>while</code>, <code>do-while</code>, <code>for</code>, dan <code>switch-case</code>.</li>\n <li>if/else, if bersarang, operator perbandingan, dan operator logika.</li></ul>","tests":[{"name":"Nilai kelas beragam","input":"3\n1\nFadli Akbar\n8A\n80\n90\n70\n85\n75\n80\n90\n95\nNisa Putri\n8B\n70\n75\n80\n70\n70\n75\n70\n90\nBima Pratama\n8A\n90\n80\n85\n90\n95\n80\n80\n70\n2\n3\n5","hidden":false,"checks":[["Jumlah Siswa",3],["Jumlah Lulus",1],["Jumlah Remedial Nilai",1],["Rata-rata Nilai Akhir",79.48333333333333]]},{"name":"Syarat lulus dan kehadiran","input":"2\n1\nSiti Aminah\n8C\n80\n80\n80\n80\n80\n80\n80\n80\nRafi Nugraha\n8A\n70\n70\n70\n70\n70\n90\n90\n85\n2\n3\n5","hidden":true,"checks":[["Jumlah Siswa",2],["Jumlah Lulus",2],["Jumlah Remedial Nilai",0],["Rata-rata Nilai Akhir",83]]},{"name":"Nilai rendah dan tinggi","input":"0\n2\n1\nDoni Saputra\n8A\n100\n100\n100\n100\n100\n100\n100\n100\nRani Putri\n8B\n50\n50\n50\n50\n50\n50\n50\n60\n2\n3\n5","hidden":true,"checks":[["Jumlah Siswa",2],["Jumlah Lulus",1],["Jumlah Remedial Nilai",1],["Rata-rata Nilai Akhir",75]]}]},{"id":"atm-simulator","title":"ATM Simulator","subtitle":"Catat transaksi beberapa nasabah dengan array, validasi saldo, fungsi, dan laporan keuangan.","category":"DO-WHILE & SWITCH","difficulty":"HARD","brief":"<p class=\"problem-description\">Bank sekolah mengadakan simulasi layanan ATM untuk beberapa nasabah. Setiap nasabah memiliki saldo awal dan melakukan tiga transaksi. Program harus memastikan saldo tidak menjadi negatif.</p><div class=\"callout\"><b>Misi:</b> Buat program laporan ATM untuk maksimal 5 nasabah. Hitung saldo akhir, total setoran, total penarikan, dan transaksi berhasil setiap nasabah.</div>\n<div class=\"section-block\"><h3>1. Data yang dimasukkan</h3><p>Masukkan jumlah data terlebih dahulu (1–5). Setelah menu muncul, pilih <b>1</b> untuk mengisi data. Masukkan data sesuai urutan. Nama, kelas, dan judul yang memiliki spasi harus terbaca sebagai satu teks utuh, bukan terpotong pada spasi pertama.</p>\n<div class=\"callout\"><b>Data setiap peserta/pelanggan:</b><ol><li>Nama lengkap nasabah.</li><li>Kelas nasabah.</li><li>Saldo awal (rupiah).</li><li>Transaksi pertama: jenis (1 = setoran, 2 = penarikan), lalu nominal.</li><li>Transaksi kedua: jenis (1 = setoran, 2 = penarikan), lalu nominal.</li><li>Transaksi ketiga: jenis (1 = setoran, 2 = penarikan), lalu nominal.</li></ol></div><p>Program harus menggunakan menu yang dapat dipilih berulang kali sampai pengguna memilih Keluar.</p>\n<div class=\"callout\"><b>Menu wajib:</b><ol><li>Input Data</li><li>Laporan</li><li>Ringkasan</li><li>Petunjuk</li><li>Keluar</li></ol></div>\n<p>Jumlah data diminta di awal dan harus diulang sampai nilainya 1–5. Setelah itu, menu ditampilkan. Menu 1 mengisi data; menu 2 dan 3 menampilkan laporan serta ringkasan.</p></div>\n<div class=\"section-block\"><h3>2. Aturan pengolahan data</h3><ul><li>Setoran menambah saldo dan total setoran nasabah.</li><li>Penarikan hanya berhasil jika saldo mencukupi. Jika saldo tidak cukup, penarikan ditolak dan saldo tidak berubah.</li><li>Nominal setiap transaksi harus lebih dari 0. Pilihan transaksi selain 1 atau 2 tidak diproses.</li><li>Transaksi Berhasil hanya menghitung transaksi yang benar-benar berhasil.</li><li>Tampilkan saldo akhir, total setoran, total penarikan, dan jumlah transaksi berhasil per nasabah. Ringkasan menjumlahkan semua nasabah.</li><li>Saldo akhir tidak boleh negatif.</li></ul></div>\n<div class=\"section-block\"><h3>3. Susunan program yang wajib digunakan</h3><ul>\n<li><b>Array:</b> gunakan array sejajar dengan kapasitas maksimal 5 data untuk menyimpan seluruh informasi.</li>\n<li><b>Function minimal:</b> buat <code>inputData()</code>, <code>hitungHasil(int indeks)</code>, <code>tentukanStatus(int indeks)</code>, <code>tampilkanLaporan()</code>, dan <code>tampilkanRingkasan()</code>. Kamu boleh menambah parameter atau fungsi pendukung bila diperlukan.</li>\n<li><b>Scope:</b> konstanta kapasitas, array, dan jumlah data dibuat global. Variabel indeks, pilihan menu, dan hasil sementara dibuat lokal di dalam fungsi.</li>\n<li><b>Object string:</b> gunakan <code>length()</code>, <code>find(\" \")</code>, <code>substr()</code>, dan <code>append()</code> dalam laporan nama.</li>\n<li><b>Looping:</b> <code>do-while</code> untuk validasi jumlah data; <code>while</code> untuk mengulang menu; <code>for</code> untuk membaca dan menampilkan array.</li>\n<li><b>Percabangan:</b> <code>switch-case</code> untuk menu 1–5, setiap case diakhiri <code>break</code>, dan if bersarang untuk menentukan status.</li>\n<li>Gunakan <code>getline()</code> untuk membaca nama/teks yang mengandung spasi, termasuk setelah input angka.</li>\n</ul></div><div class=\"callout\"><b>Batasan:</b> Jangan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan. Gunakan <code>&lt;iostream&gt;</code> dan <code>&lt;string&gt;</code> saja.</div>\n<div class=\"section-block\"><h3>4. Ringkasan yang harus ditampilkan</h3><p>Tampilkan nama label dengan ejaan yang sama persis. Angka ini adalah hasil untuk input standar yang sudah disediakan di panel STDIN.</p><pre class=\"brief-code\">Jumlah Nasabah: 3\nTransaksi Berhasil: 7\nTotal Setoran: 80000\nTotal Penarikan: 70000\nTotal Saldo Akhir: 190000</pre><p class=\"brief-note\">Menu Laporan harus menampilkan semua data satu per satu, termasuk teks lengkap, kelas/lokasi, kata pertama (jika tidak ada spasi gunakan teks utuh), jumlah karakter, hasil perhitungan, dan status. Susun label laporan menggunakan method append().</p></div>\n<div class=\"section-block\"><h3>5. Pengujian</h3><ul><li>Pastikan seluruh data yang dimasukkan diproses, bukan hanya data pertama.</li><li>Uji kondisi yang berhasil dan kondisi yang tidak memenuhi syarat.</li><li>Menu harus muncul kembali setelah Input Data, Laporan, Ringkasan, atau Petunjuk selesai.</li><li>Program hanya berhenti ketika menu Keluar dipilih.</li></ul></div>","rubric":"<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\">\n <div><span>Array sejajar dan input data</span><b>20</b></div>\n <div><span>Function dan pembagian scope</span><b>15</b></div>\n <div><span>Menu while, switch-case, do-while, dan for</span><b>20</b></div>\n <div><span>Perhitungan dan validasi aturan</span><b>20</b></div>\n <div><span>if bersarang dan operator logika</span><b>15</b></div>\n <div><span>Object string, method, dan laporan</span><b>10</b></div></div>","materials":"<h3>Materi yang dilatih</h3><ul>\n <li>Array sejajar serta variabel global dan lokal (scope).</li>\n <li>Function untuk input, perhitungan, penentuan status, laporan, dan ringkasan.</li>\n <li>Object <code>string</code>: <code>length()</code>, <code>find()</code>, <code>substr()</code>, dan <code>append()</code>.</li>\n <li><code>getline()</code> untuk membaca nama atau teks yang mengandung spasi.</li>\n <li><code>while</code>, <code>do-while</code>, <code>for</code>, dan <code>switch-case</code>.</li>\n <li>if/else, if bersarang, operator perbandingan, dan operator logika.</li></ul>","tests":[{"name":"Setoran dan penarikan beragam","input":"3\n1\nFadli Akbar\n8A\n50000\n1\n20000\n2\n30000\n2\n10000\nNisa Putri\n8B\n30000\n2\n50000\n1\n10000\n2\n5000\nBima Pratama\n8A\n100000\n2\n25000\n1\n50000\n2\n200000\n2\n3\n5","hidden":false,"checks":[["Jumlah Nasabah",3],["Transaksi Berhasil",7],["Total Setoran",80000],["Total Penarikan",70000],["Total Saldo Akhir",190000]]},{"name":"Penarikan ditolak","input":"2\n1\nSiti Aminah\n8C\n20000\n2\n25000\n1\n10000\n2\n5000\nDoni Saputra\n8A\n100000\n2\n50000\n2\n50000\n1\n10000\n2\n3\n5","hidden":true,"checks":[["Jumlah Nasabah",2],["Transaksi Berhasil",5],["Total Setoran",20000],["Total Penarikan",105000],["Total Saldo Akhir",35000]]},{"name":"Nominal kecil dan saldo besar","input":"0\n1\n1\nRani Putri\n8B\n1000\n1\n500\n2\n100\n1\n200\n2\n3\n5","hidden":true,"checks":[["Jumlah Nasabah",1],["Transaksi Berhasil",3],["Total Setoran",700],["Total Penarikan",100],["Total Saldo Akhir",1600]]}]},{"id":"smart-courier","title":"Smart Courier","subtitle":"Kelola beberapa paket dengan tarif zona, layanan ekspres, asuransi, dan rekap ongkir.","category":"PERCABANGAN BERTINGKAT","difficulty":"HARD","brief":"<p class=\"problem-description\">Jasa kurir sekolah menerima beberapa paket dari pelanggan. Petugas perlu menghitung biaya berdasarkan berat, jarak, dan layanan yang dipilih.</p><div class=\"callout\"><b>Misi:</b> Buat program pencatatan maksimal 5 paket. Hitung rincian biaya setiap paket, biaya asuransi, dan total pendapatan pengiriman.</div>\n<div class=\"section-block\"><h3>1. Data yang dimasukkan</h3><p>Masukkan jumlah data terlebih dahulu (1–5). Setelah menu muncul, pilih <b>1</b> untuk mengisi data. Masukkan data sesuai urutan. Nama, kelas, dan judul yang memiliki spasi harus terbaca sebagai satu teks utuh, bukan terpotong pada spasi pertama.</p>\n<div class=\"callout\"><b>Data setiap peserta/pelanggan:</b><ol><li>Nama lengkap pengirim.</li><li>Kelas atau bagian pengirim.</li><li>Jenis layanan: 1 = reguler, 2 = ekspres.</li><li>Berat paket (1–20 kg).</li><li>Jarak pengiriman (1–100 km).</li><li>Status asuransi: 1 = menggunakan asuransi, 0 = tanpa asuransi.</li></ol></div><p>Program harus menggunakan menu yang dapat dipilih berulang kali sampai pengguna memilih Keluar.</p>\n<div class=\"callout\"><b>Menu wajib:</b><ol><li>Input Data</li><li>Laporan</li><li>Ringkasan</li><li>Petunjuk</li><li>Keluar</li></ol></div>\n<p>Jumlah data diminta di awal dan harus diulang sampai nilainya 1–5. Setelah itu, menu ditampilkan. Menu 1 mengisi data; menu 2 dan 3 menampilkan laporan serta ringkasan.</p></div>\n<div class=\"section-block\"><h3>2. Aturan pengolahan data</h3><ul><li>Biaya Dasar = Rp8.000 + (berat × Rp2.000).</li><li>Biaya Jarak: jarak ≤10 km gratis; 11–30 km Rp4.000; lebih dari 30 km Rp8.000.</li><li>Layanan reguler tidak memiliki biaya tambahan. Layanan ekspres dikenai 50% dari jumlah Biaya Dasar dan Biaya Jarak.</li><li>Jika menggunakan asuransi (1), tambahkan Rp5.000. Jika tanpa asuransi (0), biaya asuransi 0.</li><li>Total Ongkir = Biaya Dasar + Biaya Jarak + Biaya Layanan + Biaya Asuransi.</li><li>Jenis layanan, berat, jarak, dan status asuransi harus sesuai pilihan/rentang.</li></ul></div>\n<div class=\"section-block\"><h3>3. Susunan program yang wajib digunakan</h3><ul>\n<li><b>Array:</b> gunakan array sejajar dengan kapasitas maksimal 5 data untuk menyimpan seluruh informasi.</li>\n<li><b>Function minimal:</b> buat <code>inputData()</code>, <code>hitungHasil(int indeks)</code>, <code>tentukanStatus(int indeks)</code>, <code>tampilkanLaporan()</code>, dan <code>tampilkanRingkasan()</code>. Kamu boleh menambah parameter atau fungsi pendukung bila diperlukan.</li>\n<li><b>Scope:</b> konstanta kapasitas, array, dan jumlah data dibuat global. Variabel indeks, pilihan menu, dan hasil sementara dibuat lokal di dalam fungsi.</li>\n<li><b>Object string:</b> gunakan <code>length()</code>, <code>find(\" \")</code>, <code>substr()</code>, dan <code>append()</code> dalam laporan nama.</li>\n<li><b>Looping:</b> <code>do-while</code> untuk validasi jumlah data; <code>while</code> untuk mengulang menu; <code>for</code> untuk membaca dan menampilkan array.</li>\n<li><b>Percabangan:</b> <code>switch-case</code> untuk menu 1–5, setiap case diakhiri <code>break</code>, dan if bersarang untuk menentukan status.</li>\n<li>Gunakan <code>getline()</code> untuk membaca nama/teks yang mengandung spasi, termasuk setelah input angka.</li>\n</ul></div><div class=\"callout\"><b>Batasan:</b> Jangan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan. Gunakan <code>&lt;iostream&gt;</code> dan <code>&lt;string&gt;</code> saja.</div>\n<div class=\"section-block\"><h3>4. Ringkasan yang harus ditampilkan</h3><p>Tampilkan nama label dengan ejaan yang sama persis. Angka ini adalah hasil untuk input standar yang sudah disediakan di panel STDIN.</p><pre class=\"brief-code\">Jumlah Paket: 3\nTotal Berat: 19\nTotal Biaya Layanan: 11000\nTotal Asuransi: 5000\nTotal Pendapatan Ongkir: 90000</pre><p class=\"brief-note\">Menu Laporan harus menampilkan semua data satu per satu, termasuk teks lengkap, kelas/lokasi, kata pertama (jika tidak ada spasi gunakan teks utuh), jumlah karakter, hasil perhitungan, dan status. Susun label laporan menggunakan method append().</p></div>\n<div class=\"section-block\"><h3>5. Pengujian</h3><ul><li>Pastikan seluruh data yang dimasukkan diproses, bukan hanya data pertama.</li><li>Uji kondisi yang berhasil dan kondisi yang tidak memenuhi syarat.</li><li>Menu harus muncul kembali setelah Input Data, Laporan, Ringkasan, atau Petunjuk selesai.</li><li>Program hanya berhenti ketika menu Keluar dipilih.</li></ul></div>","rubric":"<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\">\n <div><span>Array sejajar dan input data</span><b>20</b></div>\n <div><span>Function dan pembagian scope</span><b>15</b></div>\n <div><span>Menu while, switch-case, do-while, dan for</span><b>20</b></div>\n <div><span>Perhitungan dan validasi aturan</span><b>20</b></div>\n <div><span>if bersarang dan operator logika</span><b>15</b></div>\n <div><span>Object string, method, dan laporan</span><b>10</b></div></div>","materials":"<h3>Materi yang dilatih</h3><ul>\n <li>Array sejajar serta variabel global dan lokal (scope).</li>\n <li>Function untuk input, perhitungan, penentuan status, laporan, dan ringkasan.</li>\n <li>Object <code>string</code>: <code>length()</code>, <code>find()</code>, <code>substr()</code>, dan <code>append()</code>.</li>\n <li><code>getline()</code> untuk membaca nama atau teks yang mengandung spasi.</li>\n <li><code>while</code>, <code>do-while</code>, <code>for</code>, dan <code>switch-case</code>.</li>\n <li>if/else, if bersarang, operator perbandingan, dan operator logika.</li></ul>","tests":[{"name":"Paket reguler dan ekspres","input":"3\n1\nFadli Akbar\n8A\n1\n2\n8\n0\nNisa Putri\n8B\n2\n5\n25\n0\nBima Pratama\n8A\n1\n12\n50\n1\n2\n3\n5","hidden":false,"checks":[["Jumlah Paket",3],["Total Berat",19],["Total Biaya Layanan",11000],["Total Asuransi",5000],["Total Pendapatan Ongkir",90000]]},{"name":"Batas zona jarak","input":"2\n1\nSiti Aminah\n8C\n1\n3\n10\n1\nRafi Nugraha\n8A\n2\n10\n30\n0\n2\n3\n5","hidden":true,"checks":[["Jumlah Paket",2],["Total Berat",13],["Total Biaya Layanan",16000],["Total Asuransi",5000],["Total Pendapatan Ongkir",67000]]},{"name":"Paket berat ekspres","input":"0\n1\n1\nDoni Saputra\n8A\n2\n20\n100\n1\n2\n3\n5","hidden":true,"checks":[["Jumlah Paket",1],["Total Berat",20],["Total Biaya Layanan",28000],["Total Asuransi",5000],["Total Pendapatan Ongkir",89000]]}]},{"id":"theme-park","title":"Theme Park Ticketing","subtitle":"Kelola tiket beberapa pengunjung dengan aturan usia, tinggi minimum, diskon kelompok, dan hari kunjungan.","category":"NESTED IF & LOGIKA","difficulty":"HARD","brief":"<p class=\"problem-description\">Taman bermain sekolah mengadakan acara khusus dengan beberapa kategori harga tiket. Petugas harus memeriksa kelayakan pengunjung dan menghitung potongan harga untuk rombongan.</p><div class=\"callout\"><b>Misi:</b> Buat program penjualan tiket untuk maksimal 5 pemesanan. Hitung harga, status kelayakan, diskon, dan jumlah pembayaran.</div>\n<div class=\"section-block\"><h3>1. Data yang dimasukkan</h3><p>Masukkan jumlah data terlebih dahulu (1–5). Setelah menu muncul, pilih <b>1</b> untuk mengisi data. Masukkan data sesuai urutan. Nama, kelas, dan judul yang memiliki spasi harus terbaca sebagai satu teks utuh, bukan terpotong pada spasi pertama.</p>\n<div class=\"callout\"><b>Data setiap peserta/pelanggan:</b><ol><li>Nama lengkap pembeli.</li><li>Kelas pembeli.</li><li>Usia pengunjung (tahun).</li><li>Tinggi pengunjung (cm).</li><li>Hari kunjungan: 1 = hari kerja, 2 = akhir pekan.</li><li>Jumlah tiket (1–10).</li></ol></div><p>Program harus menggunakan menu yang dapat dipilih berulang kali sampai pengguna memilih Keluar.</p>\n<div class=\"callout\"><b>Menu wajib:</b><ol><li>Input Data</li><li>Laporan</li><li>Ringkasan</li><li>Petunjuk</li><li>Keluar</li></ol></div>\n<p>Jumlah data diminta di awal dan harus diulang sampai nilainya 1–5. Setelah itu, menu ditampilkan. Menu 1 mengisi data; menu 2 dan 3 menampilkan laporan serta ringkasan.</p></div>\n<div class=\"section-block\"><h3>2. Aturan pengolahan data</h3><ul><li>Harga per tiket: usia <12 tahun Rp15.000; usia 12–17 tahun Rp25.000; usia ≥18 tahun Rp40.000.</li><li>Tinggi minimum 120 cm. Jika kurang, status TIDAK MEMENUHI SYARAT dan Total Bayar 0.</li><li>Subtotal = harga tiket × jumlah tiket.</li><li>Jika memenuhi syarat dan membeli minimal 4 tiket, diskon kelompok 10% dari subtotal.</li><li>Jika memenuhi syarat dan hari kunjungan adalah hari kerja (1), diskon hari 5% dari subtotal setelah diskon kelompok.</li><li>Diskon Hari tidak dihitung dari subtotal awal. Hari harus 1 atau 2, jumlah tiket 1–10.</li></ul></div>\n<div class=\"section-block\"><h3>3. Susunan program yang wajib digunakan</h3><ul>\n<li><b>Array:</b> gunakan array sejajar dengan kapasitas maksimal 5 data untuk menyimpan seluruh informasi.</li>\n<li><b>Function minimal:</b> buat <code>inputData()</code>, <code>hitungHasil(int indeks)</code>, <code>tentukanStatus(int indeks)</code>, <code>tampilkanLaporan()</code>, dan <code>tampilkanRingkasan()</code>. Kamu boleh menambah parameter atau fungsi pendukung bila diperlukan.</li>\n<li><b>Scope:</b> konstanta kapasitas, array, dan jumlah data dibuat global. Variabel indeks, pilihan menu, dan hasil sementara dibuat lokal di dalam fungsi.</li>\n<li><b>Object string:</b> gunakan <code>length()</code>, <code>find(\" \")</code>, <code>substr()</code>, dan <code>append()</code> dalam laporan nama.</li>\n<li><b>Looping:</b> <code>do-while</code> untuk validasi jumlah data; <code>while</code> untuk mengulang menu; <code>for</code> untuk membaca dan menampilkan array.</li>\n<li><b>Percabangan:</b> <code>switch-case</code> untuk menu 1–5, setiap case diakhiri <code>break</code>, dan if bersarang untuk menentukan status.</li>\n<li>Gunakan <code>getline()</code> untuk membaca nama/teks yang mengandung spasi, termasuk setelah input angka.</li>\n</ul></div><div class=\"callout\"><b>Batasan:</b> Jangan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan. Gunakan <code>&lt;iostream&gt;</code> dan <code>&lt;string&gt;</code> saja.</div>\n<div class=\"section-block\"><h3>4. Ringkasan yang harus ditampilkan</h3><p>Tampilkan nama label dengan ejaan yang sama persis. Angka ini adalah hasil untuk input standar yang sudah disediakan di panel STDIN.</p><pre class=\"brief-code\">Jumlah Pemesanan: 3\nPengunjung Layak: 2\nPengunjung Tidak Layak: 1\nTotal Diskon: 14500\nTotal Pendapatan: 165500</pre><p class=\"brief-note\">Menu Laporan harus menampilkan semua data satu per satu, termasuk teks lengkap, kelas/lokasi, kata pertama (jika tidak ada spasi gunakan teks utuh), jumlah karakter, hasil perhitungan, dan status. Susun label laporan menggunakan method append().</p></div>\n<div class=\"section-block\"><h3>5. Pengujian</h3><ul><li>Pastikan seluruh data yang dimasukkan diproses, bukan hanya data pertama.</li><li>Uji kondisi yang berhasil dan kondisi yang tidak memenuhi syarat.</li><li>Menu harus muncul kembali setelah Input Data, Laporan, Ringkasan, atau Petunjuk selesai.</li><li>Program hanya berhenti ketika menu Keluar dipilih.</li></ul></div>","rubric":"<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\">\n <div><span>Array sejajar dan input data</span><b>20</b></div>\n <div><span>Function dan pembagian scope</span><b>15</b></div>\n <div><span>Menu while, switch-case, do-while, dan for</span><b>20</b></div>\n <div><span>Perhitungan dan validasi aturan</span><b>20</b></div>\n <div><span>if bersarang dan operator logika</span><b>15</b></div>\n <div><span>Object string, method, dan laporan</span><b>10</b></div></div>","materials":"<h3>Materi yang dilatih</h3><ul>\n <li>Array sejajar serta variabel global dan lokal (scope).</li>\n <li>Function untuk input, perhitungan, penentuan status, laporan, dan ringkasan.</li>\n <li>Object <code>string</code>: <code>length()</code>, <code>find()</code>, <code>substr()</code>, dan <code>append()</code>.</li>\n <li><code>getline()</code> untuk membaca nama atau teks yang mengandung spasi.</li>\n <li><code>while</code>, <code>do-while</code>, <code>for</code>, dan <code>switch-case</code>.</li>\n <li>if/else, if bersarang, operator perbandingan, dan operator logika.</li></ul>","tests":[{"name":"Rombongan dan akhir pekan","input":"3\n1\nFadli Akbar\n8A\n13\n130\n1\n4\nNisa Putri\n8B\n25\n175\n2\n2\nBima Pratama\n8A\n10\n115\n1\n3\n2\n3\n5","hidden":false,"checks":[["Jumlah Pemesanan",3],["Pengunjung Layak",2],["Pengunjung Tidak Layak",1],["Total Diskon",14500],["Total Pendapatan",165500]]},{"name":"Tepat batas usia dan tinggi","input":"2\n1\nSiti Aminah\n8C\n12\n120\n1\n4\nRafi Nugraha\n8A\n18\n150\n2\n1\n2\n3\n5","hidden":true,"checks":[["Jumlah Pemesanan",2],["Pengunjung Layak",2],["Pengunjung Tidak Layak",0],["Total Diskon",14500],["Total Pendapatan",125500]]},{"name":"Anak dan dewasa rombongan","input":"0\n1\n1\nDoni Saputra\n8A\n11\n125\n1\n5\n2\n3\n5","hidden":true,"checks":[["Jumlah Pemesanan",1],["Pengunjung Layak",1],["Pengunjung Tidak Layak",0],["Total Diskon",10875],["Total Pendapatan",64125]]}]},{"id":"robot-tournament","title":"Robot Tournament Scoring","subtitle":"Olah nilai beberapa tim robotik dengan tiga ronde, penalti, predikat, dan kelulusan.","category":"LOGIKA & AKUMULATOR","difficulty":"HARD","brief":"<p class=\"problem-description\">Panitia lomba robotik harus mengolah hasil beberapa tim. Setiap tim mengikuti tiga ronde, memperoleh nilai, dan dapat terkena penalti pelanggaran.</p><div class=\"callout\"><b>Misi:</b> Buat program penilaian untuk maksimal 5 tim. Hitung skor akhir dan predikat, tentukan kelulusan berdasarkan nilai setiap ronde, lalu tampilkan ringkasan lomba.</div>\n<div class=\"section-block\"><h3>1. Data yang dimasukkan</h3><p>Masukkan jumlah data terlebih dahulu (1–5). Setelah menu muncul, pilih <b>1</b> untuk mengisi data. Masukkan data sesuai urutan. Nama, kelas, dan judul yang memiliki spasi harus terbaca sebagai satu teks utuh, bukan terpotong pada spasi pertama.</p>\n<div class=\"callout\"><b>Data setiap peserta/pelanggan:</b><ol><li>Nama tim.</li><li>Kelas asal tim.</li><li>Nilai ronde pertama (0–100).</li><li>Nilai ronde kedua (0–100).</li><li>Nilai ronde ketiga (0–100).</li><li>Jumlah pelanggaran (0–20).</li></ol></div><p>Program harus menggunakan menu yang dapat dipilih berulang kali sampai pengguna memilih Keluar.</p>\n<div class=\"callout\"><b>Menu wajib:</b><ol><li>Input Data</li><li>Laporan</li><li>Ringkasan</li><li>Petunjuk</li><li>Keluar</li></ol></div>\n<p>Jumlah data diminta di awal dan harus diulang sampai nilainya 1–5. Setelah itu, menu ditampilkan. Menu 1 mengisi data; menu 2 dan 3 menampilkan laporan serta ringkasan.</p></div>\n<div class=\"section-block\"><h3>2. Aturan pengolahan data</h3><ul><li>Total Skor = jumlah nilai dari ketiga ronde.</li><li>Setiap pelanggaran mengurangi 5 poin. Poin Penalti = jumlah pelanggaran × 5.</li><li>Skor Akhir = Total Skor − Poin Penalti. Jika kurang dari 0, gunakan 0.</li><li>Predikat EMAS jika skor akhir ≥250; PERAK jika ≥200; PERUNGGU jika ≥150; selain itu PEMBINAAN.</li><li>Tim LULUS hanya jika setiap ronde mendapat nilai minimal 50 dan Skor Akhir minimal 180. Gunakan if bersarang untuk memeriksa syarat ronde dan skor akhir.</li></ul></div>\n<div class=\"section-block\"><h3>3. Susunan program yang wajib digunakan</h3><ul>\n<li><b>Array:</b> gunakan array sejajar dengan kapasitas maksimal 5 data untuk menyimpan seluruh informasi.</li>\n<li><b>Function minimal:</b> buat <code>inputData()</code>, <code>hitungHasil(int indeks)</code>, <code>tentukanStatus(int indeks)</code>, <code>tampilkanLaporan()</code>, dan <code>tampilkanRingkasan()</code>. Kamu boleh menambah parameter atau fungsi pendukung bila diperlukan.</li>\n<li><b>Scope:</b> konstanta kapasitas, array, dan jumlah data dibuat global. Variabel indeks, pilihan menu, dan hasil sementara dibuat lokal di dalam fungsi.</li>\n<li><b>Object string:</b> gunakan <code>length()</code>, <code>find(\" \")</code>, <code>substr()</code>, dan <code>append()</code> dalam laporan nama.</li>\n<li><b>Looping:</b> <code>do-while</code> untuk validasi jumlah data; <code>while</code> untuk mengulang menu; <code>for</code> untuk membaca dan menampilkan array.</li>\n<li><b>Percabangan:</b> <code>switch-case</code> untuk menu 1–5, setiap case diakhiri <code>break</code>, dan if bersarang untuk menentukan status.</li>\n<li>Gunakan <code>getline()</code> untuk membaca nama/teks yang mengandung spasi, termasuk setelah input angka.</li>\n</ul></div><div class=\"callout\"><b>Batasan:</b> Jangan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan. Gunakan <code>&lt;iostream&gt;</code> dan <code>&lt;string&gt;</code> saja.</div>\n<div class=\"section-block\"><h3>4. Ringkasan yang harus ditampilkan</h3><p>Tampilkan nama label dengan ejaan yang sama persis. Angka ini adalah hasil untuk input standar yang sudah disediakan di panel STDIN.</p><pre class=\"brief-code\">Jumlah Tim: 3\nTim Lulus: 1\nRata-rata Skor Akhir: 213.33\nSkor Tertinggi: 260</pre><p class=\"brief-note\">Menu Laporan harus menampilkan semua data satu per satu, termasuk teks lengkap, kelas/lokasi, kata pertama (jika tidak ada spasi gunakan teks utuh), jumlah karakter, hasil perhitungan, dan status. Susun label laporan menggunakan method append().</p></div>\n<div class=\"section-block\"><h3>5. Pengujian</h3><ul><li>Pastikan seluruh data yang dimasukkan diproses, bukan hanya data pertama.</li><li>Uji kondisi yang berhasil dan kondisi yang tidak memenuhi syarat.</li><li>Menu harus muncul kembali setelah Input Data, Laporan, Ringkasan, atau Petunjuk selesai.</li><li>Program hanya berhenti ketika menu Keluar dipilih.</li></ul></div>","rubric":"<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\">\n <div><span>Array sejajar dan input data</span><b>20</b></div>\n <div><span>Function dan pembagian scope</span><b>15</b></div>\n <div><span>Menu while, switch-case, do-while, dan for</span><b>20</b></div>\n <div><span>Perhitungan dan validasi aturan</span><b>20</b></div>\n <div><span>if bersarang dan operator logika</span><b>15</b></div>\n <div><span>Object string, method, dan laporan</span><b>10</b></div></div>","materials":"<h3>Materi yang dilatih</h3><ul>\n <li>Array sejajar serta variabel global dan lokal (scope).</li>\n <li>Function untuk input, perhitungan, penentuan status, laporan, dan ringkasan.</li>\n <li>Object <code>string</code>: <code>length()</code>, <code>find()</code>, <code>substr()</code>, dan <code>append()</code>.</li>\n <li><code>getline()</code> untuk membaca nama atau teks yang mengandung spasi.</li>\n <li><code>while</code>, <code>do-while</code>, <code>for</code>, dan <code>switch-case</code>.</li>\n <li>if/else, if bersarang, operator perbandingan, dan operator logika.</li></ul>","tests":[{"name":"Tim dengan predikat berbeda","input":"3\n1\nAlpha Tech\n8A\n90\n85\n95\n2\nRoboKids\n8B\n60\n65\n70\n5\nByte Force\n8A\n40\n90\n80\n0\n2\n3\n5","hidden":false,"checks":[["Jumlah Tim",3],["Tim Lulus",1],["Rata-rata Skor Akhir",213.33333333333334],["Skor Tertinggi",260]]},{"name":"Syarat setiap ronde","input":"2\n1\nSiti Robot\n8C\n50\n70\n65\n1\nRafi Bot\n8A\n100\n95\n90\n0\n2\n3\n5","hidden":true,"checks":[["Jumlah Tim",2],["Tim Lulus",2],["Rata-rata Skor Akhir",232.5],["Skor Tertinggi",285]]},{"name":"Penalti besar","input":"0\n1\n1\nDoni Mecha\n8A\n60\n60\n60\n15\n2\n3\n5","hidden":true,"checks":[["Jumlah Tim",1],["Tim Lulus",0],["Rata-rata Skor Akhir",105],["Skor Tertinggi",105]]}]},{"id":"warehouse-stock","title":"Warehouse Stock Control","subtitle":"Kelola stok beberapa barang dengan validasi transaksi keluar dan status restok.","category":"LOOP & SWITCH","difficulty":"HARD","brief":"<p class=\"problem-description\">Gudang peralatan ICT menyimpan beberapa jenis barang. Petugas perlu mencatat stok awal, barang masuk, barang keluar, dan menentukan barang yang harus segera diisi ulang.</p><div class=\"callout\"><b>Misi:</b> Buat program pengelolaan maksimal 5 jenis barang. Hitung stok akhir setiap barang dan buat ringkasan seluruh persediaan.</div>\n<div class=\"section-block\"><h3>1. Data yang dimasukkan</h3><p>Masukkan jumlah data terlebih dahulu (1–5). Setelah menu muncul, pilih <b>1</b> untuk mengisi data. Masukkan data sesuai urutan. Nama, kelas, dan judul yang memiliki spasi harus terbaca sebagai satu teks utuh, bukan terpotong pada spasi pertama.</p>\n<div class=\"callout\"><b>Data setiap peserta/pelanggan:</b><ol><li>Nama barang (boleh lebih dari satu kata).</li><li>Lokasi atau nama rak penyimpanan.</li><li>Stok awal (0–100.000 unit).</li><li>Jumlah barang masuk.</li><li>Jumlah barang keluar yang diminta.</li><li>Batas minimum stok untuk peringatan.</li></ol></div><p>Program harus menggunakan menu yang dapat dipilih berulang kali sampai pengguna memilih Keluar.</p>\n<div class=\"callout\"><b>Menu wajib:</b><ol><li>Input Data</li><li>Laporan</li><li>Ringkasan</li><li>Petunjuk</li><li>Keluar</li></ol></div>\n<p>Jumlah data diminta di awal dan harus diulang sampai nilainya 1–5. Setelah itu, menu ditampilkan. Menu 1 mengisi data; menu 2 dan 3 menampilkan laporan serta ringkasan.</p></div>\n<div class=\"section-block\"><h3>2. Aturan pengolahan data</h3><ul><li>Stok tersedia sebelum barang keluar = stok awal + barang masuk.</li><li>Barang keluar berhasil hanya jika jumlah yang diminta tidak melebihi stok tersedia. Jika melebihi stok, transaksi ditolak dan jumlah barang keluar menjadi 0.</li><li>Stok Akhir = stok awal + barang masuk − barang keluar yang berhasil.</li><li>Status PERLU RESTOK jika stok akhir lebih kecil dari batas minimum; selain itu STOK AMAN.</li><li>Jumlah barang dan batas minimum tidak boleh negatif. Stok akhir tidak boleh negatif.</li><li>Ringkasan menampilkan total stok awal, barang masuk, barang keluar yang berhasil, stok akhir, dan jumlah jenis barang yang perlu restok.</li></ul></div>\n<div class=\"section-block\"><h3>3. Susunan program yang wajib digunakan</h3><ul>\n<li><b>Array:</b> gunakan array sejajar dengan kapasitas maksimal 5 data untuk menyimpan seluruh informasi.</li>\n<li><b>Function minimal:</b> buat <code>inputData()</code>, <code>hitungHasil(int indeks)</code>, <code>tentukanStatus(int indeks)</code>, <code>tampilkanLaporan()</code>, dan <code>tampilkanRingkasan()</code>. Kamu boleh menambah parameter atau fungsi pendukung bila diperlukan.</li>\n<li><b>Scope:</b> konstanta kapasitas, array, dan jumlah data dibuat global. Variabel indeks, pilihan menu, dan hasil sementara dibuat lokal di dalam fungsi.</li>\n<li><b>Object string:</b> gunakan <code>length()</code>, <code>find(\" \")</code>, <code>substr()</code>, dan <code>append()</code> dalam laporan nama.</li>\n<li><b>Looping:</b> <code>do-while</code> untuk validasi jumlah data; <code>while</code> untuk mengulang menu; <code>for</code> untuk membaca dan menampilkan array.</li>\n<li><b>Percabangan:</b> <code>switch-case</code> untuk menu 1–5, setiap case diakhiri <code>break</code>, dan if bersarang untuk menentukan status.</li>\n<li>Gunakan <code>getline()</code> untuk membaca nama/teks yang mengandung spasi, termasuk setelah input angka.</li>\n</ul></div><div class=\"callout\"><b>Batasan:</b> Jangan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan. Gunakan <code>&lt;iostream&gt;</code> dan <code>&lt;string&gt;</code> saja.</div>\n<div class=\"section-block\"><h3>4. Ringkasan yang harus ditampilkan</h3><p>Tampilkan nama label dengan ejaan yang sama persis. Angka ini adalah hasil untuk input standar yang sudah disediakan di panel STDIN.</p><pre class=\"brief-code\">Jumlah Jenis Barang: 3\nTotal Stok Awal: 130\nTotal Barang Masuk: 65\nTotal Barang Keluar: 35\nTotal Stok Akhir: 160\nBarang Perlu Restok: 0</pre><p class=\"brief-note\">Menu Laporan harus menampilkan semua data satu per satu, termasuk teks lengkap, kelas/lokasi, kata pertama (jika tidak ada spasi gunakan teks utuh), jumlah karakter, hasil perhitungan, dan status. Susun label laporan menggunakan method append().</p></div>\n<div class=\"section-block\"><h3>5. Pengujian</h3><ul><li>Pastikan seluruh data yang dimasukkan diproses, bukan hanya data pertama.</li><li>Uji kondisi yang berhasil dan kondisi yang tidak memenuhi syarat.</li><li>Menu harus muncul kembali setelah Input Data, Laporan, Ringkasan, atau Petunjuk selesai.</li><li>Program hanya berhenti ketika menu Keluar dipilih.</li></ul></div>","rubric":"<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\">\n <div><span>Array sejajar dan input data</span><b>20</b></div>\n <div><span>Function dan pembagian scope</span><b>15</b></div>\n <div><span>Menu while, switch-case, do-while, dan for</span><b>20</b></div>\n <div><span>Perhitungan dan validasi aturan</span><b>20</b></div>\n <div><span>if bersarang dan operator logika</span><b>15</b></div>\n <div><span>Object string, method, dan laporan</span><b>10</b></div></div>","materials":"<h3>Materi yang dilatih</h3><ul>\n <li>Array sejajar serta variabel global dan lokal (scope).</li>\n <li>Function untuk input, perhitungan, penentuan status, laporan, dan ringkasan.</li>\n <li>Object <code>string</code>: <code>length()</code>, <code>find()</code>, <code>substr()</code>, dan <code>append()</code>.</li>\n <li><code>getline()</code> untuk membaca nama atau teks yang mengandung spasi.</li>\n <li><code>while</code>, <code>do-while</code>, <code>for</code>, dan <code>switch-case</code>.</li>\n <li>if/else, if bersarang, operator perbandingan, dan operator logika.</li></ul>","tests":[{"name":"Stok aman dan perlu restok","input":"3\n1\nKabel USB\nRak A\n100\n50\n30\n40\nSensor Ultrasonik\nRak B\n20\n0\n25\n10\nMotor DC\nRak C\n10\n15\n5\n15\n2\n3\n5","hidden":false,"checks":[["Jumlah Jenis Barang",3],["Total Stok Awal",130],["Total Barang Masuk",65],["Total Barang Keluar",35],["Total Stok Akhir",160],["Barang Perlu Restok",0]]},{"name":"Barang keluar tepat sesuai stok","input":"2\n1\nArduino Uno\nRak A\n10\n0\n10\n1\nServo Motor\nRak B\n5\n10\n5\n4\n2\n3\n5","hidden":true,"checks":[["Jumlah Jenis Barang",2],["Total Stok Awal",15],["Total Barang Masuk",10],["Total Barang Keluar",15],["Total Stok Akhir",10],["Barang Perlu Restok",1]]},{"name":"Stok awal kosong","input":"0\n1\n1\nLED Merah\nRak C\n0\n20\n5\n10\n2\n3\n5","hidden":true,"checks":[["Jumlah Jenis Barang",1],["Total Stok Awal",0],["Total Barang Masuk",20],["Total Barang Keluar",5],["Total Stok Akhir",15],["Barang Perlu Restok",0]]}]},{"id":"internet-plan","title":"Internet Plan Billing","subtitle":"Kelola tagihan beberapa pelanggan dengan paket, kuota berlebih, diskon member, dan laporan.","category":"SWITCH & DISKON","difficulty":"HARD","brief":"<p class=\"problem-description\">Penyedia internet memiliki pelanggan dengan paket, pemakaian data, dan masa berlangganan berbeda. Program harus menghitung tagihan setiap pelanggan serta total pendapatan.</p><div class=\"callout\"><b>Misi:</b> Buat program tagihan untuk maksimal 5 pelanggan. Hitung biaya paket, biaya kuota berlebih, diskon member, dan total tagihan.</div>\n<div class=\"section-block\"><h3>1. Data yang dimasukkan</h3><p>Masukkan jumlah data terlebih dahulu (1–5). Setelah menu muncul, pilih <b>1</b> untuk mengisi data. Masukkan data sesuai urutan. Nama, kelas, dan judul yang memiliki spasi harus terbaca sebagai satu teks utuh, bukan terpotong pada spasi pertama.</p>\n<div class=\"callout\"><b>Data setiap peserta/pelanggan:</b><ol><li>Nama lengkap pelanggan.</li><li>Kelas atau kelompok pelanggan.</li><li>Paket: 1 = Basic, 2 = Pro, 3 = Max.</li><li>Pemakaian internet setiap bulan (GB).</li><li>Lama berlangganan (bulan).</li><li>Status member: 1 = member, 0 = bukan member.</li></ol></div><p>Program harus menggunakan menu yang dapat dipilih berulang kali sampai pengguna memilih Keluar.</p>\n<div class=\"callout\"><b>Menu wajib:</b><ol><li>Input Data</li><li>Laporan</li><li>Ringkasan</li><li>Petunjuk</li><li>Keluar</li></ol></div>\n<p>Jumlah data diminta di awal dan harus diulang sampai nilainya 1–5. Setelah itu, menu ditampilkan. Menu 1 mengisi data; menu 2 dan 3 menampilkan laporan serta ringkasan.</p></div>\n<div class=\"section-block\"><h3>2. Aturan pengolahan data</h3><ul><li>Basic: kuota 20 GB, Rp50.000/bulan. Pro: 50 GB, Rp90.000/bulan. Max: 100 GB, Rp150.000/bulan.</li><li>Biaya Paket = harga paket × lama berlangganan.</li><li>Kelebihan kuota per bulan = pemakaian − kuota paket. Jika hasilnya negatif, gunakan 0.</li><li>Biaya Kelebihan = kelebihan GB per bulan × Rp5.000 × lama berlangganan.</li><li>Member dengan masa berlangganan minimal 6 bulan mendapat diskon 15%. Jika belum 6 bulan tetapi tagihan sebelum diskon minimal Rp200.000, diskon 10%. Non-member tidak mendapat diskon.</li><li>Total Bayar = Biaya Paket + Biaya Kelebihan − Diskon. Gunakan if bersarang untuk menentukan diskon.</li></ul></div>\n<div class=\"section-block\"><h3>3. Susunan program yang wajib digunakan</h3><ul>\n<li><b>Array:</b> gunakan array sejajar dengan kapasitas maksimal 5 data untuk menyimpan seluruh informasi.</li>\n<li><b>Function minimal:</b> buat <code>inputData()</code>, <code>hitungHasil(int indeks)</code>, <code>tentukanStatus(int indeks)</code>, <code>tampilkanLaporan()</code>, dan <code>tampilkanRingkasan()</code>. Kamu boleh menambah parameter atau fungsi pendukung bila diperlukan.</li>\n<li><b>Scope:</b> konstanta kapasitas, array, dan jumlah data dibuat global. Variabel indeks, pilihan menu, dan hasil sementara dibuat lokal di dalam fungsi.</li>\n<li><b>Object string:</b> gunakan <code>length()</code>, <code>find(\" \")</code>, <code>substr()</code>, dan <code>append()</code> dalam laporan nama.</li>\n<li><b>Looping:</b> <code>do-while</code> untuk validasi jumlah data; <code>while</code> untuk mengulang menu; <code>for</code> untuk membaca dan menampilkan array.</li>\n<li><b>Percabangan:</b> <code>switch-case</code> untuk menu 1–5, setiap case diakhiri <code>break</code>, dan if bersarang untuk menentukan status.</li>\n<li>Gunakan <code>getline()</code> untuk membaca nama/teks yang mengandung spasi, termasuk setelah input angka.</li>\n</ul></div><div class=\"callout\"><b>Batasan:</b> Jangan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan. Gunakan <code>&lt;iostream&gt;</code> dan <code>&lt;string&gt;</code> saja.</div>\n<div class=\"section-block\"><h3>4. Ringkasan yang harus ditampilkan</h3><p>Tampilkan nama label dengan ejaan yang sama persis. Angka ini adalah hasil untuk input standar yang sudah disediakan di panel STDIN.</p><pre class=\"brief-code\">Jumlah Pelanggan: 3\nTotal Biaya Paket: 1270000\nTotal Biaya Kelebihan: 150000\nTotal Diskon: 177000\nTotal Tagihan: 1243000</pre><p class=\"brief-note\">Menu Laporan harus menampilkan semua data satu per satu, termasuk teks lengkap, kelas/lokasi, kata pertama (jika tidak ada spasi gunakan teks utuh), jumlah karakter, hasil perhitungan, dan status. Susun label laporan menggunakan method append().</p></div>\n<div class=\"section-block\"><h3>5. Pengujian</h3><ul><li>Pastikan seluruh data yang dimasukkan diproses, bukan hanya data pertama.</li><li>Uji kondisi yang berhasil dan kondisi yang tidak memenuhi syarat.</li><li>Menu harus muncul kembali setelah Input Data, Laporan, Ringkasan, atau Petunjuk selesai.</li><li>Program hanya berhenti ketika menu Keluar dipilih.</li></ul></div>","rubric":"<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\">\n <div><span>Array sejajar dan input data</span><b>20</b></div>\n <div><span>Function dan pembagian scope</span><b>15</b></div>\n <div><span>Menu while, switch-case, do-while, dan for</span><b>20</b></div>\n <div><span>Perhitungan dan validasi aturan</span><b>20</b></div>\n <div><span>if bersarang dan operator logika</span><b>15</b></div>\n <div><span>Object string, method, dan laporan</span><b>10</b></div></div>","materials":"<h3>Materi yang dilatih</h3><ul>\n <li>Array sejajar serta variabel global dan lokal (scope).</li>\n <li>Function untuk input, perhitungan, penentuan status, laporan, dan ringkasan.</li>\n <li>Object <code>string</code>: <code>length()</code>, <code>find()</code>, <code>substr()</code>, dan <code>append()</code>.</li>\n <li><code>getline()</code> untuk membaca nama atau teks yang mengandung spasi.</li>\n <li><code>while</code>, <code>do-while</code>, <code>for</code>, dan <code>switch-case</code>.</li>\n <li>if/else, if bersarang, operator perbandingan, dan operator logika.</li></ul>","tests":[{"name":"Paket dan pemakaian berbeda","input":"3\n1\nFadli Akbar\n8A\n1\n15\n2\n0\nNisa Putri\n8B\n2\n60\n3\n1\nBima Pratama\n8A\n3\n100\n6\n1\n2\n3\n5","hidden":false,"checks":[["Jumlah Pelanggan",3],["Total Biaya Paket",1270000],["Total Biaya Kelebihan",150000],["Total Diskon",177000],["Total Tagihan",1243000]]},{"name":"Diskon masa langganan","input":"2\n1\nSiti Aminah\n8C\n2\n45\n2\n0\nRafi Nugraha\n8A\n1\n30\n3\n1\n2\n3\n5","hidden":true,"checks":[["Jumlah Pelanggan",2],["Total Biaya Paket",330000],["Total Biaya Kelebihan",150000],["Total Diskon",30000],["Total Tagihan",450000]]},{"name":"Pemakaian tepat kuota","input":"0\n1\n1\nDoni Saputra\n8A\n1\n20\n1\n0\n2\n3\n5","hidden":true,"checks":[["Jumlah Pelanggan",1],["Total Biaya Paket",50000],["Total Biaya Kelebihan",0],["Total Diskon",0],["Total Tagihan",50000]]}]},{"id":"festival-ticket","title":"Festival Ticketing System","subtitle":"Kelola pemesanan tiket festival dengan kategori, diskon member, dan biaya admin QRIS.","category":"FINAL CHALLENGE","difficulty":"HARD","brief":"<p class=\"problem-description\">Festival sekolah menjual tiket Reguler, VIP, dan VVIP. Panitia harus mencatat beberapa pembeli, menghitung jumlah tiket, dan membuat laporan pendapatan.</p><div class=\"callout\"><b>Misi:</b> Buat program pemesanan untuk maksimal 5 pembeli. Hitung subtotal, diskon, biaya admin, total pembayaran, dan ringkasan seluruh pesanan.</div>\n<div class=\"section-block\"><h3>1. Data yang dimasukkan</h3><p>Masukkan jumlah data terlebih dahulu (1–5). Setelah menu muncul, pilih <b>1</b> untuk mengisi data. Masukkan data sesuai urutan. Nama, kelas, dan judul yang memiliki spasi harus terbaca sebagai satu teks utuh, bukan terpotong pada spasi pertama.</p>\n<div class=\"callout\"><b>Data setiap peserta/pelanggan:</b><ol><li>Nama lengkap pembeli.</li><li>Kelas atau kelompok pembeli.</li><li>Status member: 1 = member, 0 = bukan member.</li><li>Kategori tiket: 1 = Reguler, 2 = VIP, 3 = VVIP.</li><li>Jumlah tiket (1–10).</li><li>Metode pembayaran: 1 = tunai, 2 = QRIS.</li></ol></div><p>Program harus menggunakan menu yang dapat dipilih berulang kali sampai pengguna memilih Keluar.</p>\n<div class=\"callout\"><b>Menu wajib:</b><ol><li>Input Data</li><li>Laporan</li><li>Ringkasan</li><li>Petunjuk</li><li>Keluar</li></ol></div>\n<p>Jumlah data diminta di awal dan harus diulang sampai nilainya 1–5. Setelah itu, menu ditampilkan. Menu 1 mengisi data; menu 2 dan 3 menampilkan laporan serta ringkasan.</p></div>\n<div class=\"section-block\"><h3>2. Aturan pengolahan data</h3><ul><li>Harga tiket: Reguler Rp25.000, VIP Rp60.000, VVIP Rp100.000.</li><li>Subtotal = harga tiket × jumlah tiket.</li><li>Member mendapat diskon 10% jika subtotal ≥ Rp150.000; jika ≥ Rp75.000 mendapat 5%; selain itu 0%.</li><li>Non-member mendapat diskon 5% jika subtotal ≥ Rp200.000; selain itu 0%.</li><li>Tunai tidak dikenai admin. QRIS dikenai biaya admin 1,5% dari subtotal setelah diskon.</li><li>Total Bayar = Subtotal − Diskon + Biaya Admin. Validasi kategori, jumlah, member, dan metode pembayaran.</li></ul></div>\n<div class=\"section-block\"><h3>3. Susunan program yang wajib digunakan</h3><ul>\n<li><b>Array:</b> gunakan array sejajar dengan kapasitas maksimal 5 data untuk menyimpan seluruh informasi.</li>\n<li><b>Function minimal:</b> buat <code>inputData()</code>, <code>hitungHasil(int indeks)</code>, <code>tentukanStatus(int indeks)</code>, <code>tampilkanLaporan()</code>, dan <code>tampilkanRingkasan()</code>. Kamu boleh menambah parameter atau fungsi pendukung bila diperlukan.</li>\n<li><b>Scope:</b> konstanta kapasitas, array, dan jumlah data dibuat global. Variabel indeks, pilihan menu, dan hasil sementara dibuat lokal di dalam fungsi.</li>\n<li><b>Object string:</b> gunakan <code>length()</code>, <code>find(\" \")</code>, <code>substr()</code>, dan <code>append()</code> dalam laporan nama.</li>\n<li><b>Looping:</b> <code>do-while</code> untuk validasi jumlah data; <code>while</code> untuk mengulang menu; <code>for</code> untuk membaca dan menampilkan array.</li>\n<li><b>Percabangan:</b> <code>switch-case</code> untuk menu 1–5, setiap case diakhiri <code>break</code>, dan if bersarang untuk menentukan status.</li>\n<li>Gunakan <code>getline()</code> untuk membaca nama/teks yang mengandung spasi, termasuk setelah input angka.</li>\n</ul></div><div class=\"callout\"><b>Batasan:</b> Jangan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan. Gunakan <code>&lt;iostream&gt;</code> dan <code>&lt;string&gt;</code> saja.</div>\n<div class=\"section-block\"><h3>4. Ringkasan yang harus ditampilkan</h3><p>Tampilkan nama label dengan ejaan yang sama persis. Angka ini adalah hasil untuk input standar yang sudah disediakan di panel STDIN.</p><pre class=\"brief-code\">Jumlah Pemesanan: 3\nTotal Tiket: 8\nTotal Subtotal: 420000\nTotal Diskon: 25000\nTotal Admin: 4500\nTotal Pendapatan: 399500</pre><p class=\"brief-note\">Menu Laporan harus menampilkan semua data satu per satu, termasuk teks lengkap, kelas/lokasi, kata pertama (jika tidak ada spasi gunakan teks utuh), jumlah karakter, hasil perhitungan, dan status. Susun label laporan menggunakan method append().</p></div>\n<div class=\"section-block\"><h3>5. Pengujian</h3><ul><li>Pastikan seluruh data yang dimasukkan diproses, bukan hanya data pertama.</li><li>Uji kondisi yang berhasil dan kondisi yang tidak memenuhi syarat.</li><li>Menu harus muncul kembali setelah Input Data, Laporan, Ringkasan, atau Petunjuk selesai.</li><li>Program hanya berhenti ketika menu Keluar dipilih.</li></ul></div>","rubric":"<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\">\n <div><span>Array sejajar dan input data</span><b>20</b></div>\n <div><span>Function dan pembagian scope</span><b>15</b></div>\n <div><span>Menu while, switch-case, do-while, dan for</span><b>20</b></div>\n <div><span>Perhitungan dan validasi aturan</span><b>20</b></div>\n <div><span>if bersarang dan operator logika</span><b>15</b></div>\n <div><span>Object string, method, dan laporan</span><b>10</b></div></div>","materials":"<h3>Materi yang dilatih</h3><ul>\n <li>Array sejajar serta variabel global dan lokal (scope).</li>\n <li>Function untuk input, perhitungan, penentuan status, laporan, dan ringkasan.</li>\n <li>Object <code>string</code>: <code>length()</code>, <code>find()</code>, <code>substr()</code>, dan <code>append()</code>.</li>\n <li><code>getline()</code> untuk membaca nama atau teks yang mengandung spasi.</li>\n <li><code>while</code>, <code>do-while</code>, <code>for</code>, dan <code>switch-case</code>.</li>\n <li>if/else, if bersarang, operator perbandingan, dan operator logika.</li></ul>","tests":[{"name":"Tiga kategori tiket","input":"3\n1\nFadli Akbar\n8A\n1\n1\n4\n1\nNisa Putri\n8B\n0\n2\n2\n2\nBima Pratama\n8A\n1\n3\n2\n2\n2\n3\n5","hidden":false,"checks":[["Jumlah Pemesanan",3],["Total Tiket",8],["Total Subtotal",420000],["Total Diskon",25000],["Total Admin",4500],["Total Pendapatan",399500]]},{"name":"Member dan non-member","input":"2\n1\nSiti Aminah\n8C\n0\n3\n2\n2\nRafi Nugraha\n8A\n1\n2\n1\n1\n2\n3\n5","hidden":true,"checks":[["Jumlah Pemesanan",2],["Total Tiket",3],["Total Subtotal",260000],["Total Diskon",10000],["Total Admin",2850],["Total Pendapatan",252850]]},{"name":"Batas diskon tiket reguler","input":"0\n1\n1\nDoni Saputra\n8A\n1\n1\n3\n1\n2\n3\n5","hidden":true,"checks":[["Jumlah Pemesanan",1],["Total Tiket",3],["Total Subtotal",75000],["Total Diskon",3750],["Total Admin",0],["Total Pendapatan",71250]]}]}];

let currentTask = 0, activeDraftTaskId = null, editor, editorCompartment, timerInterval = null, compileBusy = false;
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
let autoSubmissionInFlight = false;
let progress;
try { progress=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{"solved":[],"drafts":{},"scores":{}}'); } catch { progress={solved:[],drafts:{},scores:{}}; }

function toast(message,type='good') { const node=document.createElement('div');node.className=`toast ${type}`;node.textContent=message;$('#toastRegion').append(node);setTimeout(()=>node.remove(),3600); }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function saveProgress() { localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));renderProgress(); }
function renderTaskList() {
  $('#challengeCount').textContent = String(tasks.length).padStart(2, '0');
  $('#challengeList').innerHTML = tasks.map((task, index) => {
    const solved = (progress.solved || []).includes(task.id);
    return '<button class="challenge-item" data-task="' + index + '">' +
      '<span class="challenge-number">' + String(index + 1).padStart(2, '0') + '</span>' +
      '<span class="challenge-copy"><b class="challenge-name">' + escapeHTML(task.title) + '</b><small>' + escapeHTML(task.difficulty) + ' · ' + escapeHTML(task.category) + '</small></span>' +
      '<span class="challenge-check" id="done' + index + '" aria-label="' + (solved ? 'Selesai' : 'Belum selesai') + '">' + icon(solved ? 'checkCircle' : 'circle', 14, solved ? 'is-done' : 'is-pending') + '</span>' +
      '</button>';
  }).join('');
}
function renderProgress() {
  const validIds = tasks.map(task => task.id);
  progress.solved = (progress.solved || []).filter(id => validIds.includes(id));
  const done = progress.solved.length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $('#solvedCount').textContent = done;
  $('#challengeTotal').textContent = tasks.length;
  $('#xpTotal').textContent = done * 500;
  $('#progressPercent').textContent = percent + '%';
  $('#progressBar').style.width = percent + '%';
  tasks.forEach((task, index) => {
    const el = document.getElementById('done' + index);
    if (!el) return;
    const solved = progress.solved.includes(task.id);
    el.innerHTML = icon(solved ? 'checkCircle' : 'circle', 14, solved ? 'is-done' : 'is-pending');
    el.setAttribute('aria-label', solved ? 'Selesai' : 'Belum selesai');
  });
}
function getCode() { return editor.state.doc.toString(); }
function setCode(value) { editor.dispatch({changes:{from:0,to:editor.state.doc.length,insert:value}}); }
function getStoredDraft(taskId) {
  try {
    const standaloneDraft = localStorage.getItem(DRAFT_PREFIX + taskId);
    if (standaloneDraft !== null) return standaloneDraft;
  } catch (error) {
    console.warn('Standalone draft lookup failed:', error);
  }
  const legacyDraft = progress.drafts?.[taskId];
  return typeof legacyDraft === 'string' ? legacyDraft : null;
}
function saveDraft() {
  if (!editor || !tasks[currentTask]) return false;
  const taskId = activeDraftTaskId;
  if (!taskId) return false;
  const code = getCode();
  let standaloneSaved = false;
  let progressSaved = false;

  try {
    localStorage.setItem(DRAFT_PREFIX + taskId, code);
    standaloneSaved = true;
  } catch (error) {
    console.error('Could not save standalone code draft:', error);
  }

  try {
    progress.drafts = progress.drafts || {};
    progress.drafts[taskId] = code;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    progressSaved = true;
  } catch (error) {
    console.error('Could not save progress record:', error);
  }

  const saved = standaloneSaved || progressSaved;
  const status = $('#editorStatus');
  if (status) status.textContent = saved ? 'Draft tersimpan otomatis' : 'Draft gagal disimpan';
  if (lastSubmission && lastSubmission.code !== code) {
    lastSubmission = null;
    $('#submitBtn').disabled = true;
    $('#scorePreview').textContent = 'Kode berubah · Jalankan Check Tests kembali.';
  }
  updateCursorInfo();
  return saved;
}
function updateCursorInfo() { if(!editor?.state)return;const pos=editor.state.selection.main.head;const line=editor.state.doc.lineAt(pos);$('#lineCount').textContent=line.number;$('#columnCount').textContent=pos-line.from+1; }

function getPublicStandardTest(task) {
  return task.tests.find(test => !test.hidden) || task.tests[0] || { input: '', checks: [] };
}
function fitStandardInput() {
  const input = $('#stdinInput');
  if (!input) return;
  input.style.height = 'auto';
  input.style.overflowY = 'hidden';
  input.style.height = Math.max(132, input.scrollHeight + 2) + 'px';
}
function renderStandardIO(task) {
  const test = getPublicStandardTest(task);
  const inputKey = 'cppMissionLab_stdin_' + task.id;
  const savedInput = localStorage.getItem(inputKey);
  $('#stdinInput').value = savedInput !== null ? savedInput : (test.input || '');
  fitStandardInput();
}
function restoreStandardInput() {
  const task = tasks[currentTask];
  const test = getPublicStandardTest(task);
  $('#stdinInput').value = test.input || '';
  fitStandardInput();
  localStorage.setItem('cppMissionLab_stdin_' + task.id, $('#stdinInput').value);
  toast('Input standar untuk ' + task.title + ' dipulihkan.');
}
function renderTask(index) {
  if(compileBusy){toast('Tunggu proses kompilasi selesai sebelum berpindah tugas.','bad');return;}
  // Save only after a task has actually been loaded. On first page load,
  // editor still contains starterCode and must not overwrite the saved draft.
  if(activeDraftTaskId) saveDraft();
  currentTask=index;
  const task=tasks[index];
  activeDraftTaskId=task.id;
  document.querySelectorAll('.challenge-item').forEach((b,i)=>b.classList.toggle('active',i===index));
  $('#problemNumber').textContent=String(index+1).padStart(2,'0');$('#problemStage').textContent=task.category;$('#problemTitle').textContent=task.title;$('#problemSubtitle').textContent=task.subtitle;$('#problemDifficulty').textContent=task.difficulty;$('#problemDifficulty').className='difficulty '+task.difficulty.toLowerCase();
  $('#descriptionTab').innerHTML=task.brief;$('#rubricTab').innerHTML=task.rubric;$('#materialsTab').innerHTML=task.materials;
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='description'));['description','rubric','materials'].forEach(t=>$(`#${t}Tab`).classList.toggle('hidden',t!=='description'));
  setCode(getStoredDraft(task.id) ?? starterCode);renderStandardIO(task);$('#testResultCount').textContent='—';$('#runDuration').textContent='';$('#scorePreview').textContent='Jalankan Check Tests sebelum submit.';$('#submitBtn').disabled=true;lastSubmission=null;compiledSource='';compiledModule=null;
  $('#outputView').innerHTML=`<div class="empty-console stdout-empty"><span class="terminal-glyph">${icon('terminal',18)}</span><div><strong>Standard Output (STDOUT)</strong><p>Hasil dari cout akan tampil di sini setelah kamu menekan Run Code.</p></div></div>`;
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
  if (sessionStarted && seconds <= 0) {
    finishSession(true, 'Waktu latihan ' + SESSION_SECONDS / 60 + ' menit telah habis. Jawaban terakhir sedang dikirim otomatis.');
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
  if (sessionFinished) return;
  sessionFinished = true;
  localStorage.setItem(FINISHED_KEY, '1');
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (compileWorker) compileWorker.terminate();
  if (runtimeWorker) runtimeWorker.terminate();
  if (cancelActive) cancelActive(new Error(reason));
  updateSessionLock();
  if (notify) toast(reason, 'bad');
  autoSubmitTimedOutTask();
}
function startSession() {
  if (sessionStarted && !sessionFinished) return false;
  localStorage.setItem(PENALTY_KEY, '0');
  localStorage.setItem(VIOLATION_COUNT_KEY, '0');
  localStorage.setItem(VIOLATION_LOG_KEY, '[]');
  localStorage.setItem(FINISHED_KEY, '0');
  localStorage.setItem(START_KEY, String(Date.now()));
  sessionStarted = true;
  sessionFinished = false;
  lastSubmission = null;
  renderPenalty();
  updateSessionLock();
  toast('Sesi latihan dimulai. Waktu ' + SESSION_SECONDS / 60 + ' menit berjalan.');
  updateTimer();
  if (!timerInterval) timerInterval = setInterval(updateTimer, 1000);
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
  ['runBtn','checkTestsBtn','submitBtn','resetCodeBtn','stdinInput','studentName'].forEach(id => {
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
  const resetSessionButton = $('#resetSessionBtn');
  if (resetSessionButton) resetSessionButton.hidden = !sessionStarted && !sessionFinished;
  updateTimer();
}
function showOutput(text,kind='') { $('#outputView').innerHTML=`<pre class="console-output ${kind}">${escapeHTML(text)}</pre>`;showConsole('output'); }
function showLoading(title,message,percent=15) { $('#loadingTitle').textContent=title;$('#loadingMessage').textContent=message;$('#loadingProgress').style.width=`${percent}%` ;$('#loadingOverlay').classList.remove('hidden'); }
function hideLoading() { $('#loadingOverlay').classList.add('hidden'); }
function runCompilerWorker(source, options = {}) {
  const mode = options.mode === 'tests' ? 'tests' : 'run';
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./compiler-worker.js?v=compiler-cxx20-20261104', import.meta.url), { type: 'module' });
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
        showLoading('Menyiapkan compiler C++20...', data.message || 'Memuat Clang WebAssembly.', 20);
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
        standard: 'c++20',
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

function parseLabel(output,label) { const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const match=output.match(new RegExp(`^\\s*${escaped}\\s*:\\s*(.*?)\\s*$`,'mi'));return match?match[1].trim():null; }
function compareValue(actual,expected) { if(actual===null)return false;if(typeof expected==='number'){const value=Number(actual.replace(/,/g,'.'));return Number.isFinite(value)&&Math.abs(value-expected)<=0.011;}return actual.trim().toLowerCase()===String(expected).trim().toLowerCase(); }
function renderTests(rows,total) {
  const passed=rows.filter(row=>row.ok).length;$('#testResultCount').textContent=`${passed}/${total}`;
  $('#testsView').innerHTML=`<div class="result-summary ${passed===total?'pass':'fail'}"><div class="result-score">${passed}/${total}</div><div><strong>${passed===total?'Semua test berhasil':'Masih ada test gagal'}</strong><br><small>SUBMISSION TEST · ${total} TEST CASE</small></div></div>`+rows.map((row,i)=>`<details class="test-detail" ${i===0?'open':''}><summary><span>${escapeHTML(row.hidden?'Hidden test':row.name)}</span><b class="${row.ok?'pass':'fail'} status-inline">${icon(row.ok?'check':'x',12)}<span>${row.ok?'PASS':'FAIL'}</span></b></summary>${row.hidden?'':`<div class="check-list">${row.checks.map(c=>`<div class="check-line"><span>${escapeHTML(c.label)}</span><span class="${c.ok?'pass':'fail'} status-inline">${icon(c.ok?'check':'x',12)}<span>${escapeHTML(c.actual??'Label tidak ditemukan')}</span></span></div>`).join('')}</div><pre class="test-output">${escapeHTML(row.output||'(Tidak ada output)')}</pre>`}</details>`).join('');return passed;
}
async function evaluateTaskSource(source, task) {
  const result = await runCompilerWorker(source, { mode: 'tests', tests: task.tests });
  const rows = task.tests.map((test, index) => {
    const execution = result.tests[index] || {};
    const checks = test.checks.map(([label, expected]) => {
      const actual = execution.runtimeError ? 'RUNTIME ERROR: ' + execution.runtimeError : parseLabel(execution.stdout || '', label);
      return { label, expected, actual, ok: !execution.runtimeError && compareValue(actual, expected) };
    });
    const outputParts = [];
    if (execution.stdout) outputParts.push(execution.stdout);
    if (execution.stderr) outputParts.push('[STDERR]\n' + execution.stderr);
    if (execution.runtimeError) outputParts.push('[RUNTIME ERROR]\n' + execution.runtimeError);
    return { name:test.name, hidden:!!test.hidden, ok:checks.every(check=>check.ok), checks, output:outputParts.join('\n\n') || '(Tidak ada output)' };
  });
  const total = task.tests.length;
  const passed = rows.filter(row=>row.ok).length;
  return { task:task.title, code:source, rows, passed, total, score:total?Math.round(passed/total*100):0 };
}
async function execute(mode) {
  if (sessionStarted && remainingSeconds() <= 0) updateTimer();
  if (!sessionStarted || sessionFinished || compileBusy) { toast('Sesi belum aktif, waktu telah habis, atau proses masih berjalan.','bad'); return; }
  const source=getCode();
  if (!source.trim()) { toast('Editor masih kosong.','bad'); return; }
  if (!source.includes('main(') && !source.includes('main (')) { toast('Program harus memiliki fungsi main().','bad'); return; }
  compileBusy=true;
  ['runBtn','checkTestsBtn','submitBtn'].forEach(id=>$('#'+id).disabled=true);
  const started=performance.now();
  $('#runDuration').textContent='Compiling';
  try {
    if (mode==='run') {
      showLoading('Mengompilasi C++20...','Menyiapkan Clang WebAssembly.',15);
      const result=await runCompilerWorker(source,{mode:'run',stdin:$('#stdinInput').value});
      hideLoading();
      const sections=[];
      sections.push(result.stdout || '(Program selesai tanpa menghasilkan output.)');
      if(result.stderr)sections.push('[STDERR]\n'+result.stderr);
      if(result.runtimeError)sections.push('[RUNTIME ERROR]\n'+result.runtimeError);
      showOutput(sections.join('\n\n'),result.runtimeError?'error':'success');
      toast(result.runtimeError?'Program mengalami runtime error.':'Program berhasil dijalankan.',result.runtimeError?'bad':'good');
    } else {
      showLoading('Menjalankan test case...','Memeriksa tiga skenario misi.',25);
      lastSubmission=await evaluateTaskSource(source,tasks[currentTask]);
      const passed=renderTests(lastSubmission.rows,lastSubmission.total);
      $('#scorePreview').textContent=passed+'/'+lastSubmission.total+' test lolos · Nilai '+lastSubmission.score+'/100';
      $('#submitBtn').disabled=false;
      showConsole('tests');
      toast('Pengujian selesai: '+passed+'/'+lastSubmission.total+' test lolos.',passed===lastSubmission.total?'good':'bad');
    }
    $('#runDuration').textContent=Math.round(performance.now()-started)+' ms';
  } catch(error) {
    hideLoading();showOutput(error.message||String(error),'error');$('#runDuration').textContent='Compile / runtime error';toast('Program gagal dijalankan. Periksa terminal.','bad');
  } finally {
    // Always dismiss the compiler overlay after Run Code or Check Tests completes.
    hideLoading();
    compileBusy=false;
    const locked=!sessionStarted||sessionFinished;
    $('#runBtn').disabled=locked;$('#checkTestsBtn').disabled=locked;
    $('#submitBtn').disabled=locked||!lastSubmission||lastSubmission.task!==tasks[currentTask].title||lastSubmission.code!==getCode();
  }
}
function codeFingerprint(value) {
  let hash=2166136261;const source=String(value||'');
  for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(36);
}
function captureSubmissionSnapshot(submitType) {
  const startedAtMs=Number(localStorage.getItem(START_KEY))||Date.now();
  const task=tasks[currentTask];const code=getCode();
  return {
    name:($('#studentName').value||localStorage.getItem(NAME_KEY)||'').trim(),
    task:task.title,taskId:task.id,code,startedAtMs,
    elapsedSeconds:elapsedSessionSeconds(),remainingSeconds:remainingSeconds(),
    violationCount:getViolationCount(),violations:getViolationLog(),
    submissionId:String(startedAtMs)+'_'+task.id+'_'+codeFingerprint(code),submitType
  };
}
function buildSubmissionPayload(snapshot,result) {
  return {
    submissionId:snapshot.submissionId,submitType:snapshot.submitType,
    name:snapshot.name,task:snapshot.task,code:snapshot.code,
    passed:result.passed,total:result.total,score:result.score,
    details:JSON.stringify(result.rows.map(row=>({name:row.name,ok:row.ok,checks:row.checks}))),
    submittedAtClient:new Date().toISOString(),startedAtMs:snapshot.startedAtMs,
    remainingSeconds:snapshot.remainingSeconds,elapsedSeconds:snapshot.elapsedSeconds,
    violationCount:snapshot.violationCount,violations:JSON.stringify(snapshot.violations)
  };
}
function markSubmissionSent(snapshot){localStorage.setItem(SENT_PREFIX+snapshot.submissionId,'1');}
function readPendingSubmissions() {
  try {
    const value = JSON.parse(localStorage.getItem(AUTO_PENDING_KEY) || '[]');
    return Array.isArray(value) ? value : value ? [value] : [];
  } catch { return []; }
}
function addPendingSubmission(snapshot) {
  const queue = readPendingSubmissions();
  if (!queue.some(item => item.submissionId === snapshot.submissionId)) queue.push(snapshot);
  localStorage.setItem(AUTO_PENDING_KEY, JSON.stringify(queue));
}
function removePendingSubmission(snapshot) {
  const queue = readPendingSubmissions().filter(item => item.submissionId !== snapshot.submissionId);
  if (queue.length) localStorage.setItem(AUTO_PENDING_KEY, JSON.stringify(queue));
  else localStorage.removeItem(AUTO_PENDING_KEY);
}
async function processAutoSubmission(snapshot) {
  if(localStorage.getItem(SENT_PREFIX+snapshot.submissionId)==='1'){removePendingSubmission(snapshot);toast('Jawaban sesi ini sudah pernah tersimpan di spreadsheet.');return;}
  if(!APPS_SCRIPT_URL||APPS_SCRIPT_URL.includes('PASTE_APPS_SCRIPT'))throw new Error('URL Google Apps Script belum dikonfigurasi.');
  const task=tasks.find(item=>item.id===snapshot.taskId);
  if(!task)throw new Error('Misi untuk pengiriman otomatis tidak ditemukan.');
  let result;
  if(lastSubmission&&lastSubmission.task===snapshot.task&&lastSubmission.code===snapshot.code)result=lastSubmission;
  else {showLoading('Waktu habis · Menguji jawaban...','Menjalankan test case otomatis sebelum pengiriman.',40);result=await evaluateTaskSource(snapshot.code,task);}
  await sendSubmission(buildSubmissionPayload(snapshot,result));
  markSubmissionSent(snapshot);removePendingSubmission(snapshot);
  progress.scores=progress.scores||{};progress.scores[task.id]=result.score;
  if(result.score===100)progress.solved=Array.from(new Set([...(progress.solved||[]),task.id]));
  saveProgress();hideLoading();
  showOutput('Waktu habis. Jawaban terakhir berhasil dikirim otomatis.\nNilai: '+result.score+'/100','success');
  toast('Jawaban otomatis berhasil dikirim ke spreadsheet: '+task.title+'.','good');
}
async function autoSubmitTimedOutTask() {
  if(autoSubmissionInFlight)return;
  const snapshot=captureSubmissionSnapshot('OTOMATIS - WAKTU HABIS');
  if(!snapshot.name||!snapshot.code.trim()){toast('Waktu habis. Nama atau kode kosong, sehingga jawaban tidak dapat dikirim otomatis.','bad');return;}
  if(localStorage.getItem(SENT_PREFIX+snapshot.submissionId)==='1'){toast('Waktu habis. Jawaban terakhir sudah pernah dikirim ke spreadsheet.');return;}
  addPendingSubmission(snapshot);autoSubmissionInFlight=true;
  try{await processAutoSubmission(snapshot);}
  catch(error){hideLoading();toast('Waktu habis, tetapi pengiriman otomatis belum berhasil. Salinan jawaban disimpan untuk dicoba kembali saat halaman dibuka.','bad');console.error('Automatic submission failed:',error);}
  finally{autoSubmissionInFlight=false;}
}
async function retryPendingAutoSubmission() {
  const queue = readPendingSubmissions();
  if (!queue.length || autoSubmissionInFlight) return;
  autoSubmissionInFlight = true;
  try {
    for (const snapshot of queue) {
      try { await processAutoSubmission(snapshot); }
      catch (error) {
        console.warn('Pending automatic submission could not be delivered:', error);
        break;
      }
    }
  } finally {
    autoSubmissionInFlight = false;
  }
}
function resetSession() {
  if(compileBusy||autoSubmissionInFlight){toast('Tunggu proses yang sedang berjalan sebelum mereset sesi.','bad');return;}
  if(!confirm('Mulai sesi latihan baru dengan waktu 60 menit? Penalti dan catatan pelanggaran sesi ini akan direset. Draft kode dan progres misi tetap disimpan.'))return;
  sessionStarted=true;sessionFinished=false;
  localStorage.setItem(FINISHED_KEY,'0');localStorage.setItem(START_KEY,String(Date.now()));
  localStorage.setItem(PENALTY_KEY,'0');localStorage.setItem(VIOLATION_COUNT_KEY,'0');localStorage.setItem(VIOLATION_LOG_KEY,'[]');
  lastSubmission=null;$('#scorePreview').textContent='Jalankan Check Tests sebelum submit.';$('#submitBtn').disabled=true;
  $('#startSessionModal').classList.add('hidden');$('#startSessionModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');renderPenalty();updateSessionLock();
  if(!timerInterval)timerInterval=setInterval(updateTimer,1000);
  toast('Sesi baru dimulai. Semua aturan tetap aktif; draft kode tersimpan.');
}

function toBase64Url(text) { const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''); }
function jsonpRequest(parameters) {
  return new Promise((resolve,reject)=>{const callback=`__cppMission_${Date.now()}_${Math.random().toString(36).slice(2)}`;const script=document.createElement('script');const url=new URL(APPS_SCRIPT_URL);Object.entries(parameters).forEach(([k,v])=>url.searchParams.set(k,String(v)));url.searchParams.set('callback',callback);
    const timeout=setTimeout(()=>{cleanup();reject(new Error('Pengiriman timeout. Periksa koneksi atau deployment Apps Script.'));},30000);function cleanup(){clearTimeout(timeout);delete window[callback];script.remove();}
    window[callback]=result=>{cleanup();if(result?.ok)resolve(result);else reject(new Error(result?.message||'Apps Script menolak submission.'));};script.onerror=()=>{cleanup();reject(new Error('Tidak dapat menghubungi Google Apps Script.'));};script.src=url.toString();document.head.append(script);});
}
async function sendSubmission(payload) { const encoded=toBase64Url(JSON.stringify(payload));const chunks=encoded.match(/.{1,650}/g)||[''];const session=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}_${Math.random().toString(36).slice(2)}`).replace(/-/g,'');let result;for(let i=0;i<chunks.length;i++)result=await jsonpRequest({action:'chunk',session,index:i,total:chunks.length,data:chunks[i]});if(!result?.complete)throw new Error('Submission belum diterima lengkap.');return result; }
async function submitMission() {
  if (sessionStarted && remainingSeconds() <= 0) updateTimer();
  if(!sessionStarted||sessionFinished){toast('Sesi latihan belum aktif atau sudah berakhir.','bad');return;}
  const name=$('#studentName').value.trim();if(!name){toast('Isi nama lengkap siswa terlebih dahulu.','bad');$('#studentName').focus();return;}if(!lastSubmission||lastSubmission.code!==getCode()||lastSubmission.task!==tasks[currentTask].title){toast('Jalankan Check Tests kembali sebelum submit.','bad');return;}
  if(!APPS_SCRIPT_URL||APPS_SCRIPT_URL.includes('PASTE_APPS_SCRIPT')){toast('URL Apps Script belum diatur pada config.js.','bad');return;}
  const button=$('#submitBtn');button.disabled=true;button.innerHTML='<span class="button-spinner" aria-hidden="true"></span><span>Mengirim...</span>';
  try{
    const snapshot=captureSubmissionSnapshot('MANUAL');
    snapshot.name=name;snapshot.task=lastSubmission.task;snapshot.code=lastSubmission.code;
    const result=await sendSubmission(buildSubmissionPayload(snapshot,lastSubmission));
    markSubmissionSent(snapshot);
    progress.scores=progress.scores||{};progress.scores[tasks[currentTask].id]=lastSubmission.score;if(lastSubmission.score===100){progress.solved=Array.from(new Set([...(progress.solved||[]),tasks[currentTask].id]));}saveProgress();button.innerHTML=`${icon('checkCircle',14)}<span>Terkirim</span>`;toast(`Tugas berhasil dikirim. Nilai: ${result.score??lastSubmission.score}/100.`);
  }catch(error){button.disabled=false;button.innerHTML=`${icon('upload',14)}<span>Submit Mission</span>`;toast(error.message||'Pengiriman gagal.','bad');}
}
function clearConsole(){ $('#outputView').innerHTML=`<div class="empty-console stdout-empty"><span class="terminal-glyph">${icon('terminal',18)}</span><div><strong>Standard Output (STDOUT)</strong><p>Hasil dari cout akan tampil di sini setelah Run Code.</p></div></div>`;$('#testsView').innerHTML=`<div class="empty-console"><span class="terminal-glyph">${icon('checkCircle',18)}</span><div><strong>Belum ada hasil test</strong></div></div>`;$('#testResultCount').textContent='—';$('#runDuration').textContent='';showConsole('output'); }
let clipboardWarningReturnFocus = null;
function showWarning(title,message){
  const modal=$('#clipboardWarningModal');
  // Remember the element that opened the dialog, but do not replace it
  // if another warning is raised while this dialog is already visible.
  if(modal.classList.contains('hidden')){
    const active=document.activeElement;
    clipboardWarningReturnFocus=active && active!==document.body && !modal.contains(active) ? active : null;
  }
  $('#clipboardWarningTitle').textContent=title;
  $('#clipboardWarningMessage').textContent=message;
  modal.inert=false;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  $('#clipboardWarningAcknowledge').focus();
}
function closeWarning(){
  const modal=$('#clipboardWarningModal');
  if(modal.classList.contains('hidden'))return;

  // Move focus out before setting aria-hidden/inert. This prevents an
  // active descendant from remaining inside an inaccessible dialog.
  let target=clipboardWarningReturnFocus;
  if(!target || !target.isConnected || modal.contains(target) || target.disabled){
    target=document.querySelector('#editorHost .cm-content[contenteditable="true"]')
      || document.querySelector('#editorHost textarea')
      || $('#editorHost');
  }
  if(target && typeof target.focus==='function'){
    if(target===$('#editorHost') && !target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
  }

  modal.inert=true;
  modal.setAttribute('aria-hidden','true');
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  clipboardWarningReturnFocus=null;
}
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
  // Persist the current editor contents at every lifecycle boundary as an extra safety net.
  window.addEventListener('pagehide', () => saveDraft());
  window.addEventListener('beforeunload', () => saveDraft());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveDraft();
  });

  $('#stdinInput').addEventListener('input', () => {
    const task = tasks[currentTask];
    fitStandardInput();
    if (task) localStorage.setItem('cppMissionLab_stdin_' + task.id, $('#stdinInput').value);
  });
  $('#restoreStandardInputBtn').addEventListener('click', restoreStandardInput);

  $('#startSessionForm').addEventListener('submit',submitStartSession);
  $('#startStudentName').addEventListener('input',()=>{
    $('#startSessionError').hidden=true;
    $('#startStudentName').removeAttribute('aria-invalid');
  });
  $('#challengeList').addEventListener('click', event => {
    const button = event.target.closest('.challenge-item');
    if (button && !button.disabled) renderTask(Number(button.dataset.task));
  });
  $('#resetSessionBtn').addEventListener('click', resetSession);
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));['description','rubric','materials'].forEach(t=>$(`#${t}Tab`).classList.toggle('hidden',t!==button.dataset.tab));}));
  document.querySelectorAll('[data-console-tab]').forEach(button=>button.addEventListener('click',()=>showConsole(button.dataset.consoleTab)));
  $('#runBtn').addEventListener('click',()=>execute('run'));$('#checkTestsBtn').addEventListener('click',()=>execute('submit'));$('#submitBtn').addEventListener('click',submitMission);
  $('#resetCodeBtn').addEventListener('click',()=>{if(!sessionStarted||sessionFinished)return;if(confirm('Reset kode tugas ini ke template awal?')){setCode(starterCode);saveDraft();toast('Kode berhasil di-reset.');}});
  $('#clearOutputBtn').addEventListener('click',clearConsole);
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

initEditor();initEditorResizer();bindEvents();renderTaskList();renderProgress();renderTask(0);updateSessionLock();renderPenalty();
if(sessionStarted&&!sessionFinished){updateTimer();}
else if(sessionFinished)updateTimer();
else {openStartSessionModal();updateTimer();}
if(!sessionFinished)timerInterval=setInterval(updateTimer,1000);
retryPendingAutoSubmission();
