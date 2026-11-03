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
    "id": "smart-canteen",
    "title": "Smart Canteen",
    "subtitle": "Kasir kantin dengan transaksi berulang, validasi produk, diskon bertingkat, dan metode pembayaran.",
    "category": "TRANSAKSI & LOGIKA",
    "difficulty": "MEDIUM",
    "sampleInput": "1\n1 5\n3 5\n0 0\n1",
    "brief": "<p class=\"problem-description\">Bangun aplikasi kasir kantin yang melayani beberapa jenis produk dalam satu pembelian. Program harus mencatat transaksi valid, menghitung total barang dan subtotal, menerapkan diskon sesuai status pelanggan, serta menentukan biaya pembayaran.</p><div class=\"callout\"><b>Tujuan misi:</b> Seorang siswa dapat membeli beberapa jenis produk. Input transaksi terus dibaca sampai kode sentinel <code>0 0</code> dimasukkan. Setelah itu, program membaca metode pembayaran.</div><div class=\"section-block\"><h3>1. Format input</h3><p>Baca data menggunakan <code>cin</code> sesuai urutan berikut. Tidak perlu menampilkan prompt input pada output.</p><pre class=\"brief-code\">status_member\nkode_produk jumlah\nkode_produk jumlah\n...\n0 0\nmetode_pembayaran</pre></div><div class=\"section-block\"><h3>2. Aturan dan ketentuan</h3><ul><li><b>Produk:</b> kode 1 Nasi Goreng = Rp12.000; kode 2 Roti Bakar = Rp8.000; kode 3 Jus Buah = Rp6.000; kode 4 Air Mineral = Rp4.000.</li><li>Status member: 1 = member, 0 = non-member.</li><li>Jumlah barang per baris transaksi harus 1–20. Kode produk tidak dikenal atau jumlah di luar batas diabaikan dan tidak mengubah akumulator.</li><li><b>Jumlah Transaksi</b> adalah jumlah baris pembelian valid. <b>Jumlah Barang</b> adalah total unit semua produk valid.</li><li><b>Diskon member:</b> subtotal ≥ Rp50.000 mendapat 15%; jika tidak, subtotal ≥ Rp25.000 mendapat 10%; selain itu 0%.</li><li><b>Diskon non-member:</b> subtotal ≥ Rp100.000 mendapat 10%; jika tidak, subtotal ≥ Rp50.000 mendapat 5%; selain itu 0%.</li><li>Pembayaran 1 = tunai tanpa admin. Pembayaran 2 = QRIS dengan admin 1% dari subtotal setelah diskon.</li><li>Total Bayar = Subtotal − Diskon + Biaya Admin. Gunakan bilangan bulat untuk nominal rupiah.</li></ul></div><div class=\"section-block\"><h3>3. Urutan pengerjaan</h3><ol><li>Baca status member dan siapkan seluruh variabel akumulator dengan nilai awal 0.</li><li>Gunakan <code>do-while</code> untuk membaca kode produk dan jumlah secara berulang. Hentikan saat keduanya sama-sama 0.</li><li>Gunakan <code>switch-case</code> untuk menentukan harga produk. Validasi kode dan jumlah sebelum menghitung transaksi.</li><li>Setiap transaksi valid menambah Jumlah Transaksi satu kali, Jumlah Barang sebesar jumlah unit, dan Subtotal sebesar harga × jumlah.</li><li>Setelah sentinel, hitung diskon berdasarkan status member dan subtotal menggunakan <code>if / else if / else</code> bertingkat.</li><li>Baca metode pembayaran dan gunakan <code>switch-case</code> untuk menghitung admin.</li><li>Hitung Total Bayar dan tampilkan keenam label output.</li></ol></div><div class=\"section-block\"><h3>4. Format output wajib</h3><p>Tampilkan semua label berikut persis seperti tertulis, satu label per baris, diikuti titik dua dan hasil perhitungan.</p><pre class=\"brief-code\">Jumlah Transaksi: ...\nJumlah Barang: ...\nSubtotal: ...\nDiskon: ...\nBiaya Admin: ...\nTotal Bayar: ...</pre></div><div class=\"section-block\"><h3>5. Validasi dan batasan</h3><ul><li>Sentinel <code>0 0</code> bukan transaksi dan tidak boleh dihitung.</li><li>Biaya QRIS dihitung setelah diskon.</li><li>Transaksi tidak valid tidak menambah subtotal, jumlah barang, ataupun jumlah transaksi.</li><li>Jika tidak ada transaksi valid, seluruh nilai akumulasi tetap 0.</li></ul></div><div class=\"hint-card\"><span class=\"hint-icon\">✦</span><p><strong>Tips pengerjaan:</strong> Siapkan variabel untuk setiap komponen perhitungan dan mulai akumulator dari 0. Gunakan percabangan, <code>switch-case</code>, dan perulangan sesuai kebutuhan. Array, vector, pointer, class, dan function tambahan tidak diperlukan.</p></div>",
    "rubric": "<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\"><div><span>Validasi dan input</span><b>15</b></div><div><span>do-while transaksi</span><b>15</b></div><div><span>switch-case produk/pembayaran</span><b>15</b></div><div><span>Akumulasi subtotal</span><b>15</b></div><div><span>Diskon bertingkat</span><b>20</b></div><div><span>Biaya admin dan output</span><b>20</b></div></div>",
    "materials": "<h3>Materi yang dilatih</h3><ul><li>Variabel dan operasi aritmetika.</li><li>cin, cout, dan validasi input.</li><li>Operator perbandingan dan logika.</li><li>if/else if/else dan nested if.</li><li>switch-case dan do-while.</li></ul>",
    "tests": [
      {
        "name": "Member + tunai",
        "input": "1\n1 5\n3 5\n0 0\n1",
        "hidden": false,
        "checks": [
          [
            "Jumlah Transaksi",
            2
          ],
          [
            "Jumlah Barang",
            10
          ],
          [
            "Subtotal",
            90000
          ],
          [
            "Diskon",
            13500
          ],
          [
            "Biaya Admin",
            0
          ],
          [
            "Total Bayar",
            76500
          ]
        ]
      },
      {
        "name": "Non-member + QRIS",
        "input": "0\n2 4\n4 5\n0 0\n2",
        "hidden": true,
        "checks": [
          [
            "Jumlah Transaksi",
            2
          ],
          [
            "Jumlah Barang",
            9
          ],
          [
            "Subtotal",
            52000
          ],
          [
            "Diskon",
            2600
          ],
          [
            "Biaya Admin",
            494
          ],
          [
            "Total Bayar",
            49894
          ]
        ]
      },
      {
        "name": "Produk tidak valid",
        "input": "1\n2 3\n9 1\n4 1\n0 0\n1",
        "hidden": true,
        "checks": [
          [
            "Jumlah Transaksi",
            2
          ],
          [
            "Jumlah Barang",
            4
          ],
          [
            "Subtotal",
            28000
          ],
          [
            "Diskon",
            2800
          ],
          [
            "Biaya Admin",
            0
          ],
          [
            "Total Bayar",
            25200
          ]
        ]
      }
    ]
  },
  {
    "id": "smart-parking",
    "title": "Smart Parking Gate",
    "subtitle": "Hitung tarif kendaraan dengan durasi, biaya tambahan, dan diskon member.",
    "category": "PERCABANGAN & SWITCH",
    "difficulty": "MEDIUM",
    "sampleInput": "2 5 1",
    "brief": "<p class=\"problem-description\">Buat sistem gerbang parkir yang menghitung tarif berdasarkan jenis kendaraan dan lama parkir. Pelanggan member mendapat diskon tertentu apabila nilai biaya dasar mencapai batas minimum.</p><div class=\"callout\"><b>Tujuan misi:</b> Satu program memproses satu kendaraan. Program membaca kode kendaraan, durasi parkir dalam jam, dan status member.</div><div class=\"section-block\"><h3>1. Format input</h3><p>Baca data menggunakan <code>cin</code> sesuai urutan berikut. Tidak perlu menampilkan prompt input pada output.</p><pre class=\"brief-code\">kode_kendaraan lama_parkir status_member</pre></div><div class=\"section-block\"><h3>2. Aturan dan ketentuan</h3><ul><li>Kode kendaraan: 1 = motor, 2 = mobil, 3 = bus.</li><li>Tarif per jam: motor Rp2.000; mobil Rp5.000; bus Rp8.000.</li><li>Biaya Dasar = tarif per jam × lama parkir.</li><li>Jika lama parkir lebih dari 4 jam, Biaya Tambahan adalah Rp5.000. Jika 4 jam atau kurang, Biaya Tambahan 0.</li><li>Member (1) mendapat diskon 10% dari Biaya Dasar jika Biaya Dasar minimal Rp20.000. Non-member (0) tidak mendapat diskon.</li><li>Total Bayar = Biaya Dasar + Biaya Tambahan − Diskon.</li><li>Kode kendaraan harus 1–3, lama parkir 1–24 jam, status member 0 atau 1.</li></ul></div><div class=\"section-block\"><h3>3. Urutan pengerjaan</h3><ol><li>Baca kode kendaraan, lama parkir, dan status member.</li><li>Validasi seluruh input sebelum melakukan perhitungan.</li><li>Gunakan <code>switch-case</code> untuk menentukan tarif per jam.</li><li>Kalikan tarif dengan lama parkir untuk memperoleh Biaya Dasar.</li><li>Gunakan percabangan untuk menentukan Biaya Tambahan.</li><li>Gunakan nested <code>if</code> untuk memeriksa status member dan batas Biaya Dasar sebelum menghitung diskon.</li><li>Hitung Total Bayar dan tampilkan empat label output.</li></ol></div><div class=\"section-block\"><h3>4. Format output wajib</h3><p>Tampilkan semua label berikut persis seperti tertulis, satu label per baris, diikuti titik dua dan hasil perhitungan.</p><pre class=\"brief-code\">Biaya Dasar: ...\nBiaya Tambahan: ...\nDiskon: ...\nTotal Bayar: ...</pre></div><div class=\"section-block\"><h3>5. Validasi dan batasan</h3><ul><li>Diskon dihitung dari Biaya Dasar saja, bukan dari Biaya Dasar + Biaya Tambahan.</li><li>Kondisi lebih dari 4 jam dimulai pada 5 jam.</li><li>Kode dan status yang tidak valid tidak boleh menghasilkan tarif normal.</li></ul></div><div class=\"hint-card\"><span class=\"hint-icon\">✦</span><p><strong>Tips pengerjaan:</strong> Siapkan variabel untuk setiap komponen perhitungan dan mulai akumulator dari 0. Gunakan percabangan, <code>switch-case</code>, dan perulangan sesuai kebutuhan. Array, vector, pointer, class, dan function tambahan tidak diperlukan.</p></div>",
    "rubric": "<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\"><div><span>Input dan validasi</span><b>20</b></div><div><span>switch-case kendaraan</span><b>20</b></div><div><span>Tarif dan biaya tambahan</span><b>20</b></div><div><span>Diskon member dengan nested if</span><b>20</b></div><div><span>Ringkasan akhir</span><b>20</b></div></div>",
    "materials": "<h3>Materi yang dilatih</h3><ul><li>Variabel dan operasi perkalian.</li><li>switch-case.</li><li>Operator &&, ||, dan perbandingan.</li><li>Nested if dan validasi.</li></ul>",
    "tests": [
      {
        "name": "Motor 2 jam",
        "input": "1 2 0",
        "hidden": false,
        "checks": [
          [
            "Biaya Dasar",
            4000
          ],
          [
            "Biaya Tambahan",
            0
          ],
          [
            "Diskon",
            0
          ],
          [
            "Total Bayar",
            4000
          ]
        ]
      },
      {
        "name": "Mobil member 5 jam",
        "input": "2 5 1",
        "hidden": true,
        "checks": [
          [
            "Biaya Dasar",
            25000
          ],
          [
            "Biaya Tambahan",
            5000
          ],
          [
            "Diskon",
            2500
          ],
          [
            "Total Bayar",
            27500
          ]
        ]
      },
      {
        "name": "Bus 8 jam",
        "input": "3 8 0",
        "hidden": true,
        "checks": [
          [
            "Biaya Dasar",
            64000
          ],
          [
            "Biaya Tambahan",
            5000
          ],
          [
            "Diskon",
            0
          ],
          [
            "Total Bayar",
            69000
          ]
        ]
      }
    ]
  },
  {
    "id": "academic-report",
    "title": "Rekap Nilai Akademik",
    "subtitle": "Olah nilai latihan, ujian, dan proyek menggunakan perulangan serta bobot penilaian.",
    "category": "PERULANGAN & LOGIKA",
    "difficulty": "MEDIUM",
    "sampleInput": "80 90 70 85 75 80 90",
    "brief": "<p class=\"problem-description\">Buat program rekap nilai akademik yang mengolah lima nilai latihan, satu nilai ujian, dan satu nilai proyek. Program menghitung rata-rata, nilai akhir berbobot, predikat, serta status kelulusan.</p><div class=\"callout\"><b>Tujuan misi:</b> Gunakan perulangan untuk membaca lima nilai latihan. Nilai ujian dan proyek dibaca setelah kelima nilai latihan selesai.</div><div class=\"section-block\"><h3>1. Format input</h3><p>Baca data menggunakan <code>cin</code> sesuai urutan berikut. Tidak perlu menampilkan prompt input pada output.</p><pre class=\"brief-code\">latihan_1 latihan_2 latihan_3 latihan_4 latihan_5\nnilai_ujian nilai_proyek</pre></div><div class=\"section-block\"><h3>2. Aturan dan ketentuan</h3><ul><li>Seluruh nilai berada dalam rentang 0–100.</li><li>Rata-rata Latihan = jumlah lima nilai latihan ÷ 5.</li><li>Nilai Akhir = (Rata-rata Latihan × 20%) + (Nilai Ujian × 35%) + (Nilai Proyek × 45%).</li><li>Predikat A jika nilai akhir ≥ 90; B jika ≥ 80; C jika ≥ 70; D jika ≥ 60; selain itu E.</li><li>Status LULUS hanya jika Nilai Akhir ≥ 75 <b>dan</b> Nilai Proyek ≥ 70. Jika salah satu syarat tidak terpenuhi, status PERLU REMEDIAL.</li><li>Gunakan tipe data pecahan untuk nilai rata-rata dan nilai akhir agar hasil desimal tidak terpotong.</li></ul></div><div class=\"section-block\"><h3>3. Urutan pengerjaan</h3><ol><li>Siapkan variabel akumulator untuk jumlah nilai latihan dan mulai dari 0.</li><li>Gunakan perulangan <code>for</code> sebanyak lima kali untuk membaca nilai latihan dan menambahkannya ke akumulator.</li><li>Baca nilai ujian dan nilai proyek.</li><li>Hitung Rata-rata Latihan, lalu hitung Nilai Akhir berdasarkan bobot.</li><li>Tentukan predikat menggunakan <code>if / else if / else</code> dari batas tertinggi ke terendah.</li><li>Tentukan status kelulusan menggunakan operator logika <code>&&</code>.</li><li>Tampilkan nilai rata-rata dan nilai akhir dengan dua angka desimal, kemudian predikat dan status.</li></ol></div><div class=\"section-block\"><h3>4. Format output wajib</h3><p>Tampilkan semua label berikut persis seperti tertulis, satu label per baris, diikuti titik dua dan hasil perhitungan.</p><pre class=\"brief-code\">Rata-rata Latihan: ...\nNilai Akhir: ...\nPredikat: ...\nStatus: ...</pre></div><div class=\"section-block\"><h3>5. Validasi dan batasan</h3><ul><li>Jangan gunakan tipe data integer untuk hasil rata-rata dan nilai akhir.</li><li>Gunakan <code>fixed</code> dan <code>setprecision(2)</code> bila diperlukan.</li><li>Kedua syarat kelulusan wajib terpenuhi secara bersamaan.</li></ul></div><div class=\"hint-card\"><span class=\"hint-icon\">✦</span><p><strong>Tips pengerjaan:</strong> Siapkan variabel untuk setiap komponen perhitungan dan mulai akumulator dari 0. Gunakan percabangan, <code>switch-case</code>, dan perulangan sesuai kebutuhan. Array, vector, pointer, class, dan function tambahan tidak diperlukan.</p></div>",
    "rubric": "<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\"><div><span>Input lima nilai dengan for</span><b>20</b></div><div><span>Akumulasi dan rata-rata</span><b>20</b></div><div><span>Perhitungan bobot</span><b>25</b></div><div><span>Predikat bertingkat</span><b>15</b></div><div><span>Status dengan operator logika</span><b>20</b></div></div>",
    "materials": "<h3>Materi yang dilatih</h3><ul><li>Variabel int dan double.</li><li>for dan akumulator.</li><li>Operasi aritmetika berbobot.</li><li>if/else if dan operator logika.</li><li>fixed dan setprecision.</li></ul>",
    "tests": [
      {
        "name": "Nilai baik",
        "input": "80 90 70 85 75 80 90",
        "hidden": false,
        "checks": [
          [
            "Rata-rata Latihan",
            80
          ],
          [
            "Nilai Akhir",
            84.5
          ],
          [
            "Predikat",
            "B"
          ],
          [
            "Status",
            "LULUS"
          ]
        ]
      },
      {
        "name": "Perlu remedial",
        "input": "60 60 70 50 60 60 60",
        "hidden": true,
        "checks": [
          [
            "Rata-rata Latihan",
            60
          ],
          [
            "Nilai Akhir",
            60
          ],
          [
            "Predikat",
            "D"
          ],
          [
            "Status",
            "PERLU REMEDIAL"
          ]
        ]
      },
      {
        "name": "Nilai maksimal",
        "input": "100 95 90 100 95 100 100",
        "hidden": true,
        "checks": [
          [
            "Rata-rata Latihan",
            96
          ],
          [
            "Nilai Akhir",
            99.2
          ],
          [
            "Predikat",
            "A"
          ],
          [
            "Status",
            "LULUS"
          ]
        ]
      }
    ]
  },
  {
    "id": "atm-simulator",
    "title": "ATM Simulator",
    "subtitle": "Simulasikan setoran dan penarikan berulang dengan validasi saldo.",
    "category": "DO-WHILE & SWITCH",
    "difficulty": "MEDIUM",
    "sampleInput": "50000\n1 20000\n2 30000\n0",
    "brief": "<p class=\"problem-description\">Buat simulasi mesin ATM yang melayani setoran dan penarikan berulang. Mesin harus menjaga saldo agar tidak negatif dan hanya mencatat transaksi yang benar-benar berhasil.</p><div class=\"callout\"><b>Tujuan misi:</b> Program dimulai dengan saldo awal, lalu membaca pilihan transaksi sampai pengguna memasukkan pilihan 0 untuk selesai.</div><div class=\"section-block\"><h3>1. Format input</h3><p>Baca data menggunakan <code>cin</code> sesuai urutan berikut. Tidak perlu menampilkan prompt input pada output.</p><pre class=\"brief-code\">saldo_awal\npilihan nominal\npilihan nominal\n...\n0</pre></div><div class=\"section-block\"><h3>2. Aturan dan ketentuan</h3><ul><li>Pilihan transaksi: 1 = setoran, 2 = penarikan, 0 = selesai.</li><li>Setoran menambah saldo dan Total Setoran sebesar nominal transaksi.</li><li>Penarikan mengurangi saldo dan menambah Total Penarikan hanya jika saldo mencukupi.</li><li>Nominal transaksi harus lebih dari 0. Nominal 0 atau negatif tidak diproses.</li><li>Transaksi Berhasil hanya menghitung setoran atau penarikan yang berhasil.</li><li>Penarikan yang melebihi saldo ditolak dan tidak mengubah saldo maupun akumulator.</li><li>Pilihan 0 menghentikan proses dan tidak diikuti input nominal.</li></ul></div><div class=\"section-block\"><h3>3. Urutan pengerjaan</h3><ol><li>Baca saldo awal dan siapkan Total Setoran, Total Penarikan, serta Transaksi Berhasil dengan nilai 0.</li><li>Gunakan <code>do-while</code> untuk membaca pilihan transaksi berulang.</li><li>Jika pilihan 0, hentikan perulangan. Untuk pilihan 1 atau 2, baca nominal transaksi.</li><li>Gunakan <code>switch-case</code> untuk memproses setoran atau penarikan.</li><li>Sebelum penarikan, periksa saldo. Jika tidak mencukupi, tolak transaksi tanpa mengubah variabel.</li><li>Untuk transaksi valid, perbarui saldo dan akumulator yang sesuai.</li><li>Setelah perulangan selesai, tampilkan empat label output.</li></ol></div><div class=\"section-block\"><h3>4. Format output wajib</h3><p>Tampilkan semua label berikut persis seperti tertulis, satu label per baris, diikuti titik dua dan hasil perhitungan.</p><pre class=\"brief-code\">Saldo Akhir: ...\nTransaksi Berhasil: ...\nTotal Setoran: ...\nTotal Penarikan: ...</pre></div><div class=\"section-block\"><h3>5. Validasi dan batasan</h3><ul><li>Penarikan ditolak tidak boleh mengurangi saldo.</li><li>Pilihan menu tidak valid tidak dihitung sebagai transaksi.</li><li>Pilihan sentinel 0 tidak meminta nominal.</li></ul></div><div class=\"hint-card\"><span class=\"hint-icon\">✦</span><p><strong>Tips pengerjaan:</strong> Siapkan variabel untuk setiap komponen perhitungan dan mulai akumulator dari 0. Gunakan percabangan, <code>switch-case</code>, dan perulangan sesuai kebutuhan. Array, vector, pointer, class, dan function tambahan tidak diperlukan.</p></div>",
    "rubric": "<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\"><div><span>Input transaksi</span><b>15</b></div><div><span>do-while dengan sentinel</span><b>20</b></div><div><span>switch-case</span><b>20</b></div><div><span>Validasi nominal dan saldo</span><b>25</b></div><div><span>Akumulasi dan ringkasan</span><b>20</b></div></div>",
    "materials": "<h3>Materi yang dilatih</h3><ul><li>do-while dan sentinel.</li><li>switch-case.</li><li>Nested if dan validasi saldo.</li><li>Akumulator dan operasi aritmetika.</li></ul>",
    "tests": [
      {
        "name": "Setor dan tarik",
        "input": "50000\n1 20000\n2 30000\n0",
        "hidden": false,
        "checks": [
          [
            "Saldo Akhir",
            40000
          ],
          [
            "Transaksi Berhasil",
            2
          ],
          [
            "Total Setoran",
            20000
          ],
          [
            "Total Penarikan",
            30000
          ]
        ]
      },
      {
        "name": "Penarikan ditolak",
        "input": "50000\n2 60000\n1 10000\n0",
        "hidden": true,
        "checks": [
          [
            "Saldo Akhir",
            60000
          ],
          [
            "Transaksi Berhasil",
            1
          ],
          [
            "Total Setoran",
            10000
          ],
          [
            "Total Penarikan",
            0
          ]
        ]
      },
      {
        "name": "Beberapa transaksi",
        "input": "100000\n1 50000\n2 25000\n2 200000\n0",
        "hidden": true,
        "checks": [
          [
            "Saldo Akhir",
            125000
          ],
          [
            "Transaksi Berhasil",
            2
          ],
          [
            "Total Setoran",
            50000
          ],
          [
            "Total Penarikan",
            25000
          ]
        ]
      }
    ]
  },
  {
    "id": "smart-courier",
    "title": "Smart Courier",
    "subtitle": "Hitung ongkir berdasarkan berat, zona jarak, layanan ekspres, dan asuransi.",
    "category": "PERCABANGAN BERTINGKAT",
    "difficulty": "HARD",
    "sampleInput": "2 5 25",
    "brief": "<p class=\"problem-description\">Buat kalkulator biaya pengiriman paket. Tarif ditentukan oleh berat paket, zona jarak, dan jenis layanan. Paket dengan berat tertentu juga dikenai biaya asuransi.</p><div class=\"callout\"><b>Tujuan misi:</b> Satu paket dikirim ke satu tujuan. Program membaca kode layanan, berat paket dalam kilogram, dan jarak dalam kilometer.</div><div class=\"section-block\"><h3>1. Format input</h3><p>Baca data menggunakan <code>cin</code> sesuai urutan berikut. Tidak perlu menampilkan prompt input pada output.</p><pre class=\"brief-code\">kode_layanan berat_kg jarak_km</pre></div><div class=\"section-block\"><h3>2. Aturan dan ketentuan</h3><ul><li>Kode layanan: 1 = reguler, 2 = ekspres. Berat 1–20 kg dan jarak 1–100 km.</li><li>Biaya Dasar = Rp8.000 + (berat × Rp2.000).</li><li>Biaya Jarak: jarak ≤ 10 km = Rp0; jarak 11–30 km = Rp4.000; jarak > 30 km = Rp8.000.</li><li>Layanan reguler tidak memiliki biaya tambahan layanan.</li><li>Layanan ekspres memiliki Biaya Layanan sebesar 50% × (Biaya Dasar + Biaya Jarak).</li><li>Berat ≥ 10 kg dikenai Biaya Asuransi Rp5.000. Berat di bawah 10 kg tidak dikenai asuransi.</li><li>Total Ongkir = Biaya Dasar + Biaya Jarak + Biaya Layanan + Biaya Asuransi.</li></ul></div><div class=\"section-block\"><h3>3. Urutan pengerjaan</h3><ol><li>Baca kode layanan, berat paket, dan jarak tujuan.</li><li>Validasi kode layanan serta rentang berat dan jarak.</li><li>Hitung Biaya Dasar berdasarkan berat paket.</li><li>Gunakan <code>if / else if / else</code> untuk menentukan Biaya Jarak.</li><li>Tentukan Biaya Layanan. Untuk ekspres, hitung 50% dari Biaya Dasar + Biaya Jarak.</li><li>Periksa berat paket untuk menentukan Biaya Asuransi.</li><li>Jumlahkan seluruh komponen dan tampilkan lima label output.</li></ol></div><div class=\"section-block\"><h3>4. Format output wajib</h3><p>Tampilkan semua label berikut persis seperti tertulis, satu label per baris, diikuti titik dua dan hasil perhitungan.</p><pre class=\"brief-code\">Biaya Dasar: ...\nBiaya Jarak: ...\nBiaya Layanan: ...\nBiaya Asuransi: ...\nTotal Ongkir: ...</pre></div><div class=\"section-block\"><h3>5. Validasi dan batasan</h3><ul><li>Jarak 10 km termasuk zona gratis dan jarak 30 km termasuk zona Rp4.000.</li><li>Biaya ekspres tidak memasukkan biaya asuransi.</li><li>Kode layanan di luar 1–2 atau input di luar rentang tidak valid.</li></ul></div><div class=\"hint-card\"><span class=\"hint-icon\">✦</span><p><strong>Tips pengerjaan:</strong> Siapkan variabel untuk setiap komponen perhitungan dan mulai akumulator dari 0. Gunakan percabangan, <code>switch-case</code>, dan perulangan sesuai kebutuhan. Array, vector, pointer, class, dan function tambahan tidak diperlukan.</p></div>",
    "rubric": "<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\"><div><span>Input dan validasi</span><b>15</b></div><div><span>Biaya dasar dan zona</span><b>25</b></div><div><span>Layanan ekspres</span><b>20</b></div><div><span>Asuransi bertingkat</span><b>15</b></div><div><span>Urutan hitung dan output</span><b>25</b></div></div>",
    "materials": "<h3>Materi yang dilatih</h3><ul><li>Operasi aritmetika.</li><li>if/else if/else.</li><li>Operator logika dan validasi.</li><li>Persentase serta nested if.</li></ul>",
    "tests": [
      {
        "name": "Reguler jarak dekat",
        "input": "1 2 8",
        "hidden": false,
        "checks": [
          [
            "Biaya Dasar",
            12000
          ],
          [
            "Biaya Jarak",
            0
          ],
          [
            "Biaya Layanan",
            0
          ],
          [
            "Biaya Asuransi",
            0
          ],
          [
            "Total Ongkir",
            12000
          ]
        ]
      },
      {
        "name": "Ekspres zona menengah",
        "input": "2 5 25",
        "hidden": true,
        "checks": [
          [
            "Biaya Dasar",
            18000
          ],
          [
            "Biaya Jarak",
            4000
          ],
          [
            "Biaya Layanan",
            11000
          ],
          [
            "Biaya Asuransi",
            0
          ],
          [
            "Total Ongkir",
            33000
          ]
        ]
      },
      {
        "name": "Paket berat zona jauh",
        "input": "1 12 50",
        "hidden": true,
        "checks": [
          [
            "Biaya Dasar",
            32000
          ],
          [
            "Biaya Jarak",
            8000
          ],
          [
            "Biaya Layanan",
            0
          ],
          [
            "Biaya Asuransi",
            5000
          ],
          [
            "Total Ongkir",
            45000
          ]
        ]
      }
    ]
  },
  {
    "id": "theme-park",
    "title": "Theme Park Ticketing",
    "subtitle": "Tentukan kelayakan pengunjung dan hitung diskon rombongan serta hari kunjungan.",
    "category": "NESTED IF & LOGIKA",
    "difficulty": "HARD",
    "sampleInput": "13 130 1 4",
    "brief": "<p class=\"problem-description\">Buat sistem penjualan tiket taman bermain. Harga tiket berbeda menurut usia pengunjung. Pengunjung harus memenuhi batas tinggi minimum, sedangkan pembelian rombongan dan kunjungan hari kerja dapat memperoleh diskon.</p><div class=\"callout\"><b>Tujuan misi:</b> Program menerima usia, tinggi badan, kode hari kunjungan, dan jumlah tiket.</div><div class=\"section-block\"><h3>1. Format input</h3><p>Baca data menggunakan <code>cin</code> sesuai urutan berikut. Tidak perlu menampilkan prompt input pada output.</p><pre class=\"brief-code\">usia tinggi_cm kode_hari jumlah_tiket</pre></div><div class=\"section-block\"><h3>2. Aturan dan ketentuan</h3><ul><li>Harga tiket: usia &lt; 12 tahun = Rp15.000; usia 12–17 tahun = Rp25.000; usia ≥ 18 tahun = Rp40.000.</li><li>Tinggi minimum pengunjung adalah 120 cm. Tinggi di bawah 120 cm berarti TIDAK MEMENUHI SYARAT dan Total Bayar harus 0.</li><li>Kode hari 1 = hari kerja, 2 = akhir pekan. Jumlah tiket 1–20.</li><li>Subtotal = Harga Per Tiket × Jumlah Tiket.</li><li>Jika memenuhi syarat dan jumlah tiket ≥ 4, Diskon Kelompok sebesar 10% dari Subtotal.</li><li>Jika memenuhi syarat dan kode hari 1, Diskon Hari sebesar 5% dari jumlah setelah Diskon Kelompok.</li><li>Diskon Hari dihitung setelah Diskon Kelompok, bukan dari Subtotal awal.</li><li>Jika tidak memenuhi syarat tinggi badan, kedua diskon harus 0 meskipun jumlah tiket atau kode hari memenuhi syarat.</li></ul></div><div class=\"section-block\"><h3>3. Urutan pengerjaan</h3><ol><li>Baca usia, tinggi badan, kode hari, dan jumlah tiket.</li><li>Tentukan Harga Per Tiket menggunakan <code>if / else if / else</code> berdasarkan usia.</li><li>Hitung Subtotal dari harga tiket dikalikan jumlah tiket.</li><li>Periksa tinggi badan. Jika di bawah 120 cm, tetapkan status tidak memenuhi syarat dan Total Bayar 0.</li><li>Jika memenuhi syarat, periksa jumlah tiket untuk menghitung Diskon Kelompok.</li><li>Hitung sisa setelah diskon kelompok, lalu periksa kode hari untuk menghitung Diskon Hari.</li><li>Hitung Total Bayar dan tampilkan keenam label output.</li></ol></div><div class=\"section-block\"><h3>4. Format output wajib</h3><p>Tampilkan semua label berikut persis seperti tertulis, satu label per baris, diikuti titik dua dan hasil perhitungan.</p><pre class=\"brief-code\">Harga Per Tiket: ...\nSubtotal: ...\nDiskon Kelompok: ...\nDiskon Hari: ...\nTotal Bayar: ...\nStatus: ...</pre></div><div class=\"section-block\"><h3>5. Validasi dan batasan</h3><ul><li>Harga Per Tiket dan Subtotal tetap ditampilkan meskipun tinggi badan tidak memenuhi syarat.</li><li>Jika tidak memenuhi syarat, diskon dan Total Bayar harus 0.</li><li>Validasi kode hari serta jumlah tiket.</li></ul></div><div class=\"hint-card\"><span class=\"hint-icon\">✦</span><p><strong>Tips pengerjaan:</strong> Siapkan variabel untuk setiap komponen perhitungan dan mulai akumulator dari 0. Gunakan percabangan, <code>switch-case</code>, dan perulangan sesuai kebutuhan. Array, vector, pointer, class, dan function tambahan tidak diperlukan.</p></div>",
    "rubric": "<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\"><div><span>Validasi empat input</span><b>20</b></div><div><span>Harga tiket berdasarkan usia</span><b>20</b></div><div><span>Kelayakan tinggi badan</span><b>20</b></div><div><span>Diskon berurutan</span><b>25</b></div><div><span>Ringkasan pembayaran</span><b>15</b></div></div>",
    "materials": "<h3>Materi yang dilatih</h3><ul><li>Nested if dan if/else if.</li><li>Operator perbandingan dan logika.</li><li>Operasi persentase.</li><li>Validasi beberapa input.</li></ul>",
    "tests": [
      {
        "name": "Rombongan hari kerja",
        "input": "13 130 1 4",
        "hidden": false,
        "checks": [
          [
            "Harga Per Tiket",
            25000
          ],
          [
            "Subtotal",
            100000
          ],
          [
            "Diskon Kelompok",
            10000
          ],
          [
            "Diskon Hari",
            4500
          ],
          [
            "Total Bayar",
            85500
          ],
          [
            "Status",
            "LAYAK"
          ]
        ]
      },
      {
        "name": "Dewasa akhir pekan",
        "input": "25 175 2 2",
        "hidden": true,
        "checks": [
          [
            "Harga Per Tiket",
            40000
          ],
          [
            "Subtotal",
            80000
          ],
          [
            "Diskon Kelompok",
            0
          ],
          [
            "Diskon Hari",
            0
          ],
          [
            "Total Bayar",
            80000
          ],
          [
            "Status",
            "LAYAK"
          ]
        ]
      },
      {
        "name": "Tinggi belum cukup",
        "input": "10 115 1 3",
        "hidden": true,
        "checks": [
          [
            "Harga Per Tiket",
            15000
          ],
          [
            "Subtotal",
            45000
          ],
          [
            "Diskon Kelompok",
            0
          ],
          [
            "Diskon Hari",
            0
          ],
          [
            "Total Bayar",
            0
          ],
          [
            "Status",
            "TIDAK MEMENUHI SYARAT"
          ]
        ]
      }
    ]
  },
  {
    "id": "robot-tournament",
    "title": "Robot Tournament Scoring",
    "subtitle": "Olah tiga ronde penilaian, penalti pelanggaran, predikat, dan kelulusan tim.",
    "category": "LOGIKA & AKUMULATOR",
    "difficulty": "HARD",
    "sampleInput": "90 85 95 2",
    "brief": "<p class=\"problem-description\">Buat sistem penilaian lomba robotik yang menggabungkan hasil tiga ronde dan penalti pelanggaran. Program harus menghitung skor akhir, menentukan predikat, dan mengevaluasi kelulusan tim.</p><div class=\"callout\"><b>Tujuan misi:</b> Satu tim memiliki tiga nilai ronde. Setiap pelanggaran mengurangi skor akhir dengan penalti tetap.</div><div class=\"section-block\"><h3>1. Format input</h3><p>Baca data menggunakan <code>cin</code> sesuai urutan berikut. Tidak perlu menampilkan prompt input pada output.</p><pre class=\"brief-code\">skor_ronde_1 skor_ronde_2 skor_ronde_3 jumlah_pelanggaran</pre></div><div class=\"section-block\"><h3>2. Aturan dan ketentuan</h3><ul><li>Setiap skor ronde berada pada rentang 0–100. Jumlah pelanggaran 0–20.</li><li>Total Skor = skor ronde 1 + skor ronde 2 + skor ronde 3.</li><li>Poin Penalti = jumlah pelanggaran × 5.</li><li>Skor Akhir = Total Skor − Poin Penalti. Jika hasil kurang dari 0, tetapkan Skor Akhir menjadi 0.</li><li>Predikat: EMAS jika Skor Akhir ≥ 250; PERAK jika ≥ 200; PERUNGGU jika ≥ 150; selain itu PEMBINAAN.</li><li>Status LULUS hanya jika masing-masing ronde ≥ 50 dan Skor Akhir ≥ 180. Selain itu BELUM LULUS.</li></ul></div><div class=\"section-block\"><h3>3. Urutan pengerjaan</h3><ol><li>Baca tiga skor ronde dan jumlah pelanggaran.</li><li>Validasi rentang semua input.</li><li>Hitung Total Skor dan Poin Penalti.</li><li>Kurangi Total Skor dengan Poin Penalti. Gunakan percabangan agar Skor Akhir tidak negatif.</li><li>Tentukan Predikat dengan <code>if / else if / else</code> dari ambang tertinggi.</li><li>Gunakan operator logika <code>&&</code> untuk memastikan ketiga skor ronde dan Skor Akhir memenuhi syarat kelulusan.</li><li>Tampilkan lima label output.</li></ol></div><div class=\"section-block\"><h3>4. Format output wajib</h3><p>Tampilkan semua label berikut persis seperti tertulis, satu label per baris, diikuti titik dua dan hasil perhitungan.</p><pre class=\"brief-code\">Total Skor: ...\nPoin Penalti: ...\nSkor Akhir: ...\nPredikat: ...\nStatus: ...</pre></div><div class=\"section-block\"><h3>5. Validasi dan batasan</h3><ul><li>Predikat dihitung dari Skor Akhir setelah penalti.</li><li>Skor total tinggi belum menjamin LULUS jika salah satu ronde di bawah 50.</li><li>Skor Akhir tidak boleh negatif.</li></ul></div><div class=\"hint-card\"><span class=\"hint-icon\">✦</span><p><strong>Tips pengerjaan:</strong> Siapkan variabel untuk setiap komponen perhitungan dan mulai akumulator dari 0. Gunakan percabangan, <code>switch-case</code>, dan perulangan sesuai kebutuhan. Array, vector, pointer, class, dan function tambahan tidak diperlukan.</p></div>",
    "rubric": "<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\"><div><span>Input dan validasi</span><b>15</b></div><div><span>Akumulasi skor</span><b>15</b></div><div><span>Perhitungan penalti</span><b>20</b></div><div><span>Predikat bertingkat</span><b>25</b></div><div><span>Status dengan syarat gabungan</span><b>25</b></div></div>",
    "materials": "<h3>Materi yang dilatih</h3><ul><li>Variabel dan akumulator.</li><li>Operator aritmetika/perbandingan.</li><li>Nested if dan else if.</li><li>Operator logika &&.</li></ul>",
    "tests": [
      {
        "name": "Tim skor emas",
        "input": "90 85 95 2",
        "hidden": false,
        "checks": [
          [
            "Total Skor",
            270
          ],
          [
            "Poin Penalti",
            10
          ],
          [
            "Skor Akhir",
            260
          ],
          [
            "Predikat",
            "EMAS"
          ],
          [
            "Status",
            "LULUS"
          ]
        ]
      },
      {
        "name": "Skor perunggu",
        "input": "60 65 70 5",
        "hidden": true,
        "checks": [
          [
            "Total Skor",
            195
          ],
          [
            "Poin Penalti",
            25
          ],
          [
            "Skor Akhir",
            170
          ],
          [
            "Predikat",
            "PERUNGGU"
          ],
          [
            "Status",
            "BELUM LULUS"
          ]
        ]
      },
      {
        "name": "Satu ronde di bawah batas",
        "input": "40 90 80 0",
        "hidden": true,
        "checks": [
          [
            "Total Skor",
            210
          ],
          [
            "Poin Penalti",
            0
          ],
          [
            "Skor Akhir",
            210
          ],
          [
            "Predikat",
            "PERAK"
          ],
          [
            "Status",
            "BELUM LULUS"
          ]
        ]
      }
    ]
  },
  {
    "id": "warehouse-stock",
    "title": "Warehouse Stock Control",
    "subtitle": "Kelola stok masuk dan keluar dengan transaksi berulang serta validasi persediaan.",
    "category": "LOOP & SWITCH",
    "difficulty": "HARD",
    "sampleInput": "100\n1 50\n2 30\n0",
    "brief": "<p class=\"problem-description\">Buat sistem kontrol persediaan gudang. Operator dapat mencatat barang masuk dan barang keluar secara berulang. Sistem wajib menjaga stok agar tidak negatif dan hanya menghitung transaksi yang berhasil.</p><div class=\"callout\"><b>Tujuan misi:</b> Program dimulai dengan stok awal lalu membaca transaksi sampai operator memilih menu selesai.</div><div class=\"section-block\"><h3>1. Format input</h3><p>Baca data menggunakan <code>cin</code> sesuai urutan berikut. Tidak perlu menampilkan prompt input pada output.</p><pre class=\"brief-code\">stok_awal\npilihan jumlah\npilihan jumlah\n...\n0</pre></div><div class=\"section-block\"><h3>2. Aturan dan ketentuan</h3><ul><li>Stok awal harus 0–100.000 unit.</li><li>Pilihan 1 = barang masuk, 2 = barang keluar, 0 = selesai.</li><li>Barang masuk menambah stok dan Total Barang Masuk.</li><li>Barang keluar mengurangi stok hanya jika jumlah yang diminta tidak melebihi stok tersedia.</li><li>Jumlah tiap transaksi harus 1–1.000 unit.</li><li>Transaksi Valid hanya menghitung transaksi masuk atau keluar yang berhasil.</li><li>Transaksi keluar yang ditolak tidak mengubah stok, penghitung transaksi, maupun Total Barang Keluar.</li></ul></div><div class=\"section-block\"><h3>3. Urutan pengerjaan</h3><ol><li>Baca stok awal dan siapkan Transaksi Valid, Total Barang Masuk, serta Total Barang Keluar dari nilai 0.</li><li>Gunakan <code>do-while</code> untuk membaca pilihan transaksi berulang.</li><li>Jika pilihan 0, akhiri perulangan. Jika pilihan 1 atau 2, baca jumlah barang.</li><li>Gunakan <code>switch-case</code> untuk memisahkan proses barang masuk dan keluar.</li><li>Untuk barang keluar, periksa stok tersedia sebelum mengurangi persediaan.</li><li>Jika transaksi berhasil, perbarui stok, penghitung transaksi, dan akumulator terkait.</li><li>Setelah selesai, tampilkan empat label output.</li></ol></div><div class=\"section-block\"><h3>4. Format output wajib</h3><p>Tampilkan semua label berikut persis seperti tertulis, satu label per baris, diikuti titik dua dan hasil perhitungan.</p><pre class=\"brief-code\">Stok Akhir: ...\nTransaksi Valid: ...\nTotal Barang Masuk: ...\nTotal Barang Keluar: ...</pre></div><div class=\"section-block\"><h3>5. Validasi dan batasan</h3><ul><li>Barang keluar yang ditolak tidak boleh mengubah stok.</li><li>Sentinel 0 tidak diikuti jumlah barang.</li><li>Jaga agar stok tidak pernah negatif.</li></ul></div><div class=\"hint-card\"><span class=\"hint-icon\">✦</span><p><strong>Tips pengerjaan:</strong> Siapkan variabel untuk setiap komponen perhitungan dan mulai akumulator dari 0. Gunakan percabangan, <code>switch-case</code>, dan perulangan sesuai kebutuhan. Array, vector, pointer, class, dan function tambahan tidak diperlukan.</p></div>",
    "rubric": "<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\"><div><span>Input stok dan validasi</span><b>15</b></div><div><span>do-while dan sentinel</span><b>20</b></div><div><span>switch-case transaksi</span><b>20</b></div><div><span>Validasi stok dan jumlah</span><b>25</b></div><div><span>Akumulasi dan ringkasan</span><b>20</b></div></div>",
    "materials": "<h3>Materi yang dilatih</h3><ul><li>do-while.</li><li>switch-case dan break.</li><li>Nested if untuk stok.</li><li>Akumulator dan operator logika.</li></ul>",
    "tests": [
      {
        "name": "Barang masuk dan keluar",
        "input": "100\n1 50\n2 30\n0",
        "hidden": false,
        "checks": [
          [
            "Stok Akhir",
            120
          ],
          [
            "Transaksi Valid",
            2
          ],
          [
            "Total Barang Masuk",
            50
          ],
          [
            "Total Barang Keluar",
            30
          ]
        ]
      },
      {
        "name": "Stok tidak cukup",
        "input": "20\n2 25\n1 10\n0",
        "hidden": true,
        "checks": [
          [
            "Stok Akhir",
            30
          ],
          [
            "Transaksi Valid",
            1
          ],
          [
            "Total Barang Masuk",
            10
          ],
          [
            "Total Barang Keluar",
            0
          ]
        ]
      },
      {
        "name": "Tiga transaksi valid",
        "input": "0\n1 10\n2 5\n1 7\n0",
        "hidden": true,
        "checks": [
          [
            "Stok Akhir",
            12
          ],
          [
            "Transaksi Valid",
            3
          ],
          [
            "Total Barang Masuk",
            17
          ],
          [
            "Total Barang Keluar",
            5
          ]
        ]
      }
    ]
  },
  {
    "id": "internet-plan",
    "title": "Internet Plan Billing",
    "subtitle": "Hitung tagihan paket internet dengan kuota, kelebihan pemakaian, dan diskon pelanggan.",
    "category": "SWITCH & DISKON",
    "difficulty": "HARD",
    "sampleInput": "2 60 3 1",
    "brief": "<p class=\"problem-description\">Buat program penagihan paket internet bulanan. Tagihan dipengaruhi jenis paket, kuota yang termasuk, pemakaian data per bulan, lama berlangganan, dan status member.</p><div class=\"callout\"><b>Tujuan misi:</b> Pelanggan memilih satu paket. Program menghitung biaya paket dan biaya kelebihan kuota untuk seluruh bulan, kemudian menerapkan diskon member.</div><div class=\"section-block\"><h3>1. Format input</h3><p>Baca data menggunakan <code>cin</code> sesuai urutan berikut. Tidak perlu menampilkan prompt input pada output.</p><pre class=\"brief-code\">kode_paket pemakaian_gb_per_bulan lama_berlangganan_bulan status_member</pre></div><div class=\"section-block\"><h3>2. Aturan dan ketentuan</h3><ul><li>Paket Basic (kode 1): kuota 20 GB, harga Rp50.000 per bulan.</li><li>Paket Pro (kode 2): kuota 50 GB, harga Rp90.000 per bulan.</li><li>Paket Max (kode 3): kuota 100 GB, harga Rp150.000 per bulan.</li><li>Biaya Paket = harga paket per bulan × lama berlangganan.</li><li>Kelebihan GB per bulan = pemakaian per bulan − kuota paket. Jika hasilnya negatif, gunakan 0 GB.</li><li>Biaya Kelebihan = kelebihan GB per bulan × Rp5.000 × lama berlangganan.</li><li>Tagihan sebelum diskon = Biaya Paket + Biaya Kelebihan.</li><li>Member dengan masa langganan ≥ 6 bulan mendapat diskon 15%. Jika belum 6 bulan tetapi tagihan sebelum diskon ≥ Rp200.000, diskon 10%. Kondisi lainnya 0%. Non-member tidak mendapat diskon.</li><li>Total Bayar = tagihan sebelum diskon − Diskon.</li></ul></div><div class=\"section-block\"><h3>3. Urutan pengerjaan</h3><ol><li>Baca kode paket, pemakaian per bulan, lama berlangganan, dan status member.</li><li>Gunakan <code>switch-case</code> untuk menentukan harga dan kuota paket.</li><li>Validasi kode paket, pemakaian, lama berlangganan (1–24), serta status member (0/1).</li><li>Hitung Biaya Paket berdasarkan lama berlangganan.</li><li>Hitung kelebihan pemakaian per bulan. Jika pemakaian tidak melebihi kuota, biaya kelebihan 0.</li><li>Hitung Biaya Kelebihan dengan mengalikan kelebihan GB, Rp5.000, dan jumlah bulan.</li><li>Hitung tagihan sebelum diskon. Gunakan nested <code>if</code> untuk menentukan diskon member; diskon 15% untuk masa langganan minimal 6 bulan memiliki prioritas.</li><li>Hitung Total Bayar dan tampilkan empat label output.</li></ol></div><div class=\"section-block\"><h3>4. Format output wajib</h3><p>Tampilkan semua label berikut persis seperti tertulis, satu label per baris, diikuti titik dua dan hasil perhitungan.</p><pre class=\"brief-code\">Biaya Paket: ...\nBiaya Kelebihan: ...\nDiskon: ...\nTotal Bayar: ...</pre></div><div class=\"section-block\"><h3>5. Validasi dan batasan</h3><ul><li>Pemakaian GB adalah pemakaian setiap bulan, bukan total seluruh periode.</li><li>Biaya Kelebihan harus dikalikan jumlah bulan.</li><li>Diskon 15% berlaku untuk member dengan masa langganan ≥ 6 bulan.</li><li>Non-member tidak mendapat diskon.</li></ul></div><div class=\"hint-card\"><span class=\"hint-icon\">✦</span><p><strong>Tips pengerjaan:</strong> Siapkan variabel untuk setiap komponen perhitungan dan mulai akumulator dari 0. Gunakan percabangan, <code>switch-case</code>, dan perulangan sesuai kebutuhan. Array, vector, pointer, class, dan function tambahan tidak diperlukan.</p></div>",
    "rubric": "<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\"><div><span>Input dan validasi</span><b>15</b></div><div><span>switch-case paket</span><b>20</b></div><div><span>Biaya paket dan kelebihan kuota</span><b>25</b></div><div><span>Diskon member</span><b>20</b></div><div><span>Total tagihan</span><b>20</b></div></div>",
    "materials": "<h3>Materi yang dilatih</h3><ul><li>switch-case.</li><li>Operator perbandingan dan logika.</li><li>Nested if dan persentase.</li><li>Operasi perkalian dan akumulator.</li></ul>",
    "tests": [
      {
        "name": "Basic tanpa kelebihan",
        "input": "1 15 2 0",
        "hidden": false,
        "checks": [
          [
            "Biaya Paket",
            100000
          ],
          [
            "Biaya Kelebihan",
            0
          ],
          [
            "Diskon",
            0
          ],
          [
            "Total Bayar",
            100000
          ]
        ]
      },
      {
        "name": "Pro member 3 bulan",
        "input": "2 60 3 1",
        "hidden": true,
        "checks": [
          [
            "Biaya Paket",
            270000
          ],
          [
            "Biaya Kelebihan",
            150000
          ],
          [
            "Diskon",
            42000
          ],
          [
            "Total Bayar",
            378000
          ]
        ]
      },
      {
        "name": "Max member 6 bulan",
        "input": "3 100 6 1",
        "hidden": true,
        "checks": [
          [
            "Biaya Paket",
            900000
          ],
          [
            "Biaya Kelebihan",
            0
          ],
          [
            "Diskon",
            135000
          ],
          [
            "Total Bayar",
            765000
          ]
        ]
      }
    ]
  },
  {
    "id": "festival-ticket",
    "title": "Festival Ticketing System",
    "subtitle": "Bangun kasir festival dengan banyak kategori tiket, transaksi berulang, diskon member, dan biaya QRIS.",
    "category": "FINAL CHALLENGE",
    "difficulty": "HARD",
    "sampleInput": "1\n2 2\n1 2\n0 0\n2",
    "brief": "<p class=\"problem-description\">Bangun sistem kasir festival sekolah yang melayani beberapa kategori tiket dalam satu pembelian. Sistem menghitung transaksi dan jumlah tiket, menerapkan diskon berdasarkan status member, kemudian menambahkan biaya admin sesuai metode pembayaran.</p><div class=\"callout\"><b>Tujuan misi:</b> Program membaca status member, daftar pembelian tiket berulang sampai sentinel 0 0, lalu metode pembayaran.</div><div class=\"section-block\"><h3>1. Format input</h3><p>Baca data menggunakan <code>cin</code> sesuai urutan berikut. Tidak perlu menampilkan prompt input pada output.</p><pre class=\"brief-code\">status_member\nkode_tiket jumlah\nkode_tiket jumlah\n...\n0 0\nmetode_pembayaran</pre></div><div class=\"section-block\"><h3>2. Aturan dan ketentuan</h3><ul><li>Kode tiket 1 Reguler = Rp25.000; kode 2 VIP = Rp60.000; kode 3 VVIP = Rp100.000.</li><li>Status member 1 = member dan 0 = non-member. Jumlah per transaksi 1–10.</li><li>Kode tiket tidak dikenal atau jumlah di luar rentang diabaikan.</li><li>Jumlah Transaksi menghitung baris pembelian valid. Jumlah Tiket menghitung total unit tiket.</li><li>Member: subtotal ≥ Rp150.000 mendapat diskon 10%; jika tidak, subtotal ≥ Rp75.000 mendapat 5%; selain itu 0%.</li><li>Non-member: subtotal ≥ Rp200.000 mendapat diskon 5%; selain itu 0%.</li><li>Metode pembayaran 1 = tunai tanpa admin; 2 = QRIS dengan admin 1,5% dari subtotal setelah diskon.</li><li>Total Bayar = Subtotal − Diskon + Biaya Admin.</li></ul></div><div class=\"section-block\"><h3>3. Urutan pengerjaan</h3><ol><li>Baca status member dan siapkan seluruh variabel akumulator dengan nilai awal 0.</li><li>Gunakan <code>do-while</code> untuk membaca kode tiket dan jumlah. Akhiri saat keduanya sama-sama 0.</li><li>Gunakan <code>switch-case</code> untuk menentukan harga tiket. Abaikan transaksi yang tidak valid.</li><li>Setiap baris valid menambah Jumlah Transaksi satu kali dan Jumlah Tiket sebesar jumlah unit.</li><li>Setelah sentinel, tentukan diskon menggunakan nested <code>if</code> sesuai status member dan subtotal.</li><li>Baca metode pembayaran dan gunakan <code>switch-case</code> untuk menentukan admin.</li><li>Hitung Total Bayar dan tampilkan keenam label output.</li></ol></div><div class=\"section-block\"><h3>4. Format output wajib</h3><p>Tampilkan semua label berikut persis seperti tertulis, satu label per baris, diikuti titik dua dan hasil perhitungan.</p><pre class=\"brief-code\">Jumlah Transaksi: ...\nJumlah Tiket: ...\nSubtotal: ...\nDiskon: ...\nBiaya Admin: ...\nTotal Bayar: ...</pre></div><div class=\"section-block\"><h3>5. Validasi dan batasan</h3><ul><li>Sentinel 0 0 tidak dihitung sebagai transaksi.</li><li>Biaya admin QRIS dihitung setelah diskon.</li><li>Transaksi tidak valid tidak menambah subtotal maupun penghitung.</li><li>Bedakan jumlah baris transaksi dan jumlah unit tiket.</li></ul></div><div class=\"hint-card\"><span class=\"hint-icon\">✦</span><p><strong>Tips pengerjaan:</strong> Siapkan variabel untuk setiap komponen perhitungan dan mulai akumulator dari 0. Gunakan percabangan, <code>switch-case</code>, dan perulangan sesuai kebutuhan. Array, vector, pointer, class, dan function tambahan tidak diperlukan.</p></div>",
    "rubric": "<h3>Rubrik penilaian · 100 poin</h3><div class=\"rubric-list\"><div><span>Validasi input</span><b>15</b></div><div><span>do-while transaksi</span><b>15</b></div><div><span>switch-case harga/pembayaran</span><b>20</b></div><div><span>Akumulasi transaksi/tiket</span><b>15</b></div><div><span>Diskon bertingkat</span><b>20</b></div><div><span>Admin dan total akhir</span><b>15</b></div></div>",
    "materials": "<h3>Materi yang dilatih</h3><ul><li>do-while dan sentinel.</li><li>switch-case.</li><li>Nested if dan else if.</li><li>Operator logika dan persentase.</li><li>Akumulator.</li></ul>",
    "tests": [
      {
        "name": "Member dengan QRIS",
        "input": "1\n2 2\n1 2\n0 0\n2",
        "hidden": false,
        "checks": [
          [
            "Jumlah Transaksi",
            2
          ],
          [
            "Jumlah Tiket",
            4
          ],
          [
            "Subtotal",
            170000
          ],
          [
            "Diskon",
            17000
          ],
          [
            "Biaya Admin",
            2295
          ],
          [
            "Total Bayar",
            155295
          ]
        ]
      },
      {
        "name": "Non-member VVIP QRIS",
        "input": "0\n3 2\n0 0\n2",
        "hidden": true,
        "checks": [
          [
            "Jumlah Transaksi",
            1
          ],
          [
            "Jumlah Tiket",
            2
          ],
          [
            "Subtotal",
            200000
          ],
          [
            "Diskon",
            10000
          ],
          [
            "Biaya Admin",
            2850
          ],
          [
            "Total Bayar",
            192850
          ]
        ]
      },
      {
        "name": "Kode tidak valid",
        "input": "1\n9 1\n1 3\n0 0\n1",
        "hidden": true,
        "checks": [
          [
            "Jumlah Transaksi",
            1
          ],
          [
            "Jumlah Tiket",
            3
          ],
          [
            "Subtotal",
            75000
          ],
          [
            "Diskon",
            3750
          ],
          [
            "Biaya Admin",
            0
          ],
          [
            "Total Bayar",
            71250
          ]
        ]
      }
    ]
  }
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
function saveDraft() { progress.drafts=progress.drafts||{};progress.drafts[tasks[currentTask].id]=getCode();localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));$('#editorStatus').textContent='Draft tersimpan';if(lastSubmission&&lastSubmission.code!==getCode()){lastSubmission=null;$('#submitBtn').disabled=true;$('#scorePreview').textContent='Kode berubah · Jalankan Check Tests kembali.';}updateCursorInfo(); }
function updateCursorInfo() { if(!editor?.state)return;const pos=editor.state.selection.main.head;const line=editor.state.doc.lineAt(pos);$('#lineCount').textContent=line.number;$('#columnCount').textContent=pos-line.from+1; }
function renderTask(index) {
  if(compileBusy){toast('Tunggu proses kompilasi selesai sebelum berpindah tugas.','bad');return;}saveDraft();currentTask=index;const task=tasks[index];
  document.querySelectorAll('.challenge-item').forEach((b,i)=>b.classList.toggle('active',i===index));
  $('#problemNumber').textContent=String(index+1).padStart(2,'0');$('#problemStage').textContent=task.category;$('#problemTitle').textContent=task.title;$('#problemSubtitle').textContent=task.subtitle;$('#problemDifficulty').textContent=task.difficulty;$('#problemDifficulty').className='difficulty '+task.difficulty.toLowerCase();
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
      showLoading('Mengompilasi C++17...','Menyiapkan Clang WebAssembly.',15);
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
      showOutput(lastSubmission.rows.map(row=>row.hidden?'[Hidden test] selesai':row.output).join('\n\n'),passed===lastSubmission.total?'success':'');
      toast('Pengujian selesai: '+passed+'/'+lastSubmission.total+' test lolos.',passed===lastSubmission.total?'good':'bad');
    }
    $('#runDuration').textContent=Math.round(performance.now()-started)+' ms';
  } catch(error) {
    hideLoading();showOutput(error.message||String(error),'error');$('#runDuration').textContent='Compile / runtime error';toast('Program gagal dijalankan. Periksa terminal.','bad');
  } finally {
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
  $('#challengeList').addEventListener('click', event => {
    const button = event.target.closest('.challenge-item');
    if (button && !button.disabled) renderTask(Number(button.dataset.task));
  });
  $('#resetSessionBtn').addEventListener('click', resetSession);
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

initEditor();initEditorResizer();bindEvents();renderTaskList();renderProgress();renderTask(0);updateSessionLock();renderPenalty();
if(sessionStarted&&!sessionFinished){updateTimer();}
else if(sessionFinished)updateTimer();
else {openStartSessionModal();updateTimer();}
if(!sessionFinished)timerInterval=setInterval(updateTimer,1000);
retryPendingAutoSubmission();
