# C++ Mission Lab — ICT Class

Web tugas praktik C++ dengan dua challenge gabungan materi. Mekanisme pengerjaan meniru alur `Imamsaa/Hackathon-C-Batch-1`: halaman soal dan rubrik, editor, STDIN, Run Code, test case, timer sesi dengan penalti pelanggaran, progress, serta pengiriman hasil.

## Fitur dan alur siswa

1. Siswa dapat membaca challenge brief, rubrik penilaian, dan cakupan materi sebelum sesi dimulai.
2. Siswa mengisi nama lengkap dan menekan **Mulai Sesi**. Timer 90 menit berjalan setelah itu.
3. Tidak ada mode istirahat. Setiap pelanggaran aturan yang terdeteksi mengurangi sisa waktu sebanyak 5 menit.
4. Editor CodeMirror 6 menyediakan syntax highlighting C++, nomor baris, autocomplete dasar, auto-indent, comment shortcut, Tab indent, dan Ctrl+Enter.
5. Tab STDIN menerima input berbaris untuk program yang menggunakan `cin`, `getline`, dan `cin.ignore()`.
6. **Run Code** mengompilasi lalu menjalankan kode terhadap STDIN yang dimasukkan siswa.
7. **Check Tests** menjalankan tiga skenario terpisah untuk tiap misi. Pemeriksaan membaca nilai pada baris output yang memiliki label wajib. Nilai otomatis = `test lolos / 3 × 100`.
8. **Submit Mission** baru aktif setelah pengujian. Submission mengirim nama, tugas, source code, jumlah test lolos, nilai, dan rincian pemeriksaan ke Google Spreadsheet.
9. Draft, identitas nama, progres, waktu sesi, dan total penalti disimpan di localStorage.
10. Pelanggaran yang diberi penalti meliputi copy, cut, paste, drag-and-drop kode, shortcut screenshot/print, shortcut Developer Tools/View Source, dan berpindah tab. Setiap kejadian mengurangi 300 detik; akumulasi penalti disimpan di localStorage dan ditampilkan di header.
11. Saat waktu habis, editor, Run, Check Tests, navigasi misi, dan Submit dikunci pada browser tersebut.

> Catatan: penalti berjalan di sisi browser. Browser tidak selalu dapat mendeteksi screenshot yang diambil oleh sistem operasi, kamera eksternal, atau pembukaan Developer Tools melalui menu browser. Mekanisme ini adalah deterrent, bukan jaminan anti-cheat mutlak.

## Dua challenge

### 01 — Smart Canteen
Menggabungkan input, variabel, operator aritmatika/perbandingan/logika, validasi, nested `if`, `if-else if-else`, `switch-case`, dan `do-while`. Skenario: transaksi member/non-member, pembayaran tunai/QRIS, diskon bertingkat, produk tidak valid.

### 02 — Student Analytics
Menggabungkan `cin`, `getline`, `cin.ignore`, `for`, `while`, `do-while`, `switch-case`, nested `if`, operator logika, nilai berbobot, predikat, kelulusan, dan statistik kelas.

Array, vector, function, struct, dan pointer tidak dipersyaratkan agar level tetap sejalan dengan materi yang telah diajarkan.

## Compiler WebAssembly

- Compiler: `browsercc@0.1.1` (Clang/C++17 → WebAssembly).
- Runtime: `@bjorn3/browser_wasi_shim@0.4.2`.
- Kompilasi berjalan di `js/compiler-worker.js`; eksekusi program berjalan di `js/runtime-worker.js`.
- Batas waktu tiap eksekusi program: 4 detik. Worker dihentikan bila program tidak selesai (misalnya infinite loop).
- Editor CodeMirror 6 dan dependensi compiler dimuat dari CDN. Kunjungan pertama perlu koneksi internet.
- `coi-serviceworker.js` mencoba menyediakan header COOP/COEP untuk kompatibilitas lingkungan WebAssembly di static hosting. Akses situs melalui HTTPS; browser harus mendukung Service Worker dan WebAssembly.

## Deployment GitHub Pages (tanpa build)

1. Buat repository baru atau gunakan repository yang dituju.
2. Upload **seluruh isi folder project ini** ke root branch `main` (pastikan `index.html` berada di root, bukan dalam subfolder tambahan).
3. Buka repository → **Settings → Pages**.
4. Pada **Build and deployment**, pilih **GitHub Actions**.
5. Push ke `main`; workflow `.github/workflows/deploy.yml` akan menerbitkan isi root repository.
6. URL menjadi `https://USERNAME.github.io/NAMA-REPOSITORY/`.

Tidak membutuhkan Node.js, npm, Vite, proses build, atau folder `dist`.

## Integrasi Google Spreadsheet

1. Buka Google Spreadsheet tujuan.
2. Extensions → Apps Script.
3. Salin isi `Code.gs` ke editor Apps Script.
4. Jalankan `setup()` satu kali. Script membuat sheet `Hasil Tugas C++` bila belum ada dan tidak menghapus data sheet lain.
5. Deploy → New deployment → Web app. Pilih **Execute as: Me** dan **Who has access: Anyone**.
6. Salin URL `/exec` hasil deployment.
7. Buka `js/config.js`, isi nilai `window.CPP_MISSION_APPS_SCRIPT_URL` dengan URL tersebut.
8. Commit/push perubahan ke GitHub.

Pengiriman menggunakan JSONP chunk agar kode sumber yang panjang dapat dikirim melalui endpoint Apps Script. Apps Script merakit chunk, memvalidasi payload, dan menambahkan satu baris ke Google Sheets.

## Kolom spreadsheet

Nama Peserta · Tugas · Waktu Submit · Kode C++ · Status · Test Lolos · Total Test · Nilai Akhir · Rincian Pengujian.

## Batasan integritas dan keamanan

Aplikasi ini berjalan statis di browser. Timer, localStorage, clipboard guard, peringatan pindah tab, pembatasan print/screenshot, dan test di sisi klien merupakan deterrent/UX; semuanya dapat dilewati oleh pengguna yang menguasai browser atau source JavaScript. Nilai yang dikirim dari browser bukan penilaian anti-cheat yang kriptografis. Gunakan hasil otomatis sebagai pemeriksaan format/logika awal dan tinjau source code di spreadsheet sebelum menetapkan nilai final.
