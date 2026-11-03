# C++ Mission Lab — ICT Class

Platform latihan praktik C++ untuk siswa SMP. Berisi **10 misi tingkat Medium hingga Hard**, compiler C++17 WebAssembly, CodeMirror, STDIN, pengujian otomatis, timer per sesi, proteksi pelanggaran, dan integrasi Google Spreadsheet.

## Alur siswa

1. Siswa memasukkan nama lengkap dan menekan **Mulai Sesi**.
2. Siswa mendapat waktu **60 menit** untuk berlatih. Tidak ada deadline bersama.
3. Sepuluh misi dapat dipilih dan dikerjakan dalam satu sesi. Setiap misi memiliki tiga skenario test.
4. Siswa dapat menekan **Reset Sesi** untuk memulai jatah 60 menit baru. Draft kode dan progres misi tetap tersimpan.
5. Setiap pelanggaran yang terdeteksi mengurangi waktu lima menit. Semua proteksi tetap aktif pada sesi yang baru.
6. Jika waktu habis, sesi dan editor dikunci. Kode pada misi yang sedang terbuka diuji otomatis dan dikirim ke Google Spreadsheet dengan jenis submit `OTOMATIS - WAKTU HABIS`.
7. Siswa juga dapat menjalankan Check Tests lalu mengirim melalui tombol **Submit Mission**. Kolom Jenis Submit membedakan pengiriman manual dan otomatis.

## Daftar 10 misi

| No. | Misi | Tingkat | Materi utama |
|---:|---|---|---|
| 1 | Smart Canteen | Medium | do-while, switch-case, diskon bertingkat, nested if |
| 2 | Smart Parking Gate | Medium | switch-case, validasi, diskon member |
| 3 | Rekap Nilai Akademik | Medium | for, akumulator, rata-rata, bobot nilai |
| 4 | ATM Simulator | Medium | do-while, switch-case, validasi saldo |
| 5 | Smart Courier | Hard | percabangan bertingkat, biaya layanan, persentase |
| 6 | Theme Park Ticketing | Hard | nested if, kelayakan, diskon berurutan |
| 7 | Robot Tournament Scoring | Hard | akumulator, penalti, predikat, logika gabungan |
| 8 | Warehouse Stock Control | Hard | do-while, switch-case, validasi stok |
| 9 | Internet Plan Billing | Hard | switch-case, kuota, diskon langganan |
| 10 | Festival Ticketing System | Hard | do-while, switch-case, transaksi, diskon, QRIS |

Setiap misi menggunakan tiga test case. Materi berfokus pada variabel, input/output, operator, validasi, percabangan, nested if, switch-case, dan perulangan. Array, vector, pointer, serta function tambahan tidak diwajibkan. Pada misi dengan transaksi berulang, siswa memasukkan jumlah transaksi di awal; program memproses sebanyak jumlah tersebut tanpa sentinel atau kode khusus untuk berhenti.

## Timer dan reset

- Durasi setiap sesi: **60 menit**.
- Tidak ada countdown deadline bersama.
- Reset Sesi membuat sesi baru, mengatur timer kembali ke 60 menit, dan mereset catatan penalti sesi.
- Draft kode serta progres misi tidak dihapus saat reset.
- Setiap pelanggaran terdeteksi mengurangi lima menit.
- Jika waktu habis, aplikasi menguji dan mengirim kode misi yang sedang terbuka secara otomatis.
- Bila jaringan tidak tersedia saat timeout, snapshot pengiriman tertunda disimpan di browser dan dicoba kembali saat halaman dibuka lagi.

## Proteksi latihan

Semua aturan tetap aktif:
- Copy, cut, paste, dan drag-and-drop kode dibatasi.
- Seleksi teks soal dan menu konteks dibatasi.
- Shortcut screenshot, print, Developer Tools, dan View Source dikenai penalti.
- Meninggalkan tab Mission Lab dikenai penalti.
- Setiap pelanggaran terdeteksi mengurangi waktu lima menit.

Proteksi browser adalah deterrent, bukan jaminan anti-cheat mutlak. Screenshot sistem operasi, kamera eksternal, dan beberapa jalur Developer Tools tidak dapat dipastikan terblokir oleh halaman web.

## Compiler

- Compiler: `browsercc@0.1.1` (Clang C++17 → WebAssembly).
- Runtime: `@bjorn3/browser_wasi_shim@0.4.2`.
- Compile dan eksekusi berjalan pada Web Worker.
- Run Code mendukung STDIN untuk `cin`, `getline`, dan `cin.ignore()`. Format input bebas: siswa boleh memisahkan nilai dengan spasi atau baris baru, serta bebas menggunakan satu atau beberapa perintah `cin`, selama urutan pembacaan sesuai ketentuan soal. Format input fleksibel: siswa boleh menulis nilai dalam satu baris atau banyak baris, menggunakan `cin` tunggal maupun berantai, selama urutan pembacaan data sesuai instruksi misi. Spasi dan baris baru diperlakukan sebagai pemisah input. Challenge Brief tidak memberikan contoh kode atau urutan penyelesaian agar siswa merancang algoritmanya sendiri.
- Setiap test case dijalankan dalam instance WebAssembly terpisah.
- Batas runtime per program/test case: lima detik untuk mencegah infinite loop.
- Kunjungan pertama memerlukan koneksi internet untuk memuat dependensi CDN.

## Integrasi Google Spreadsheet

1. Buka Spreadsheet tujuan → Extensions → Apps Script.
2. Ganti isi Apps Script dengan **Code.gs** terbaru dari repository.
3. Jalankan `setup()` satu kali. Script akan menambahkan header baru tanpa menghapus baris atau kolom yang sudah ada.
4. Buka **Deploy → Manage deployments → Edit → New version → Deploy**.
5. Pertahankan URL `/exec` yang sama. URL yang telah diatur di `js/config.js` dapat tetap digunakan jika deployment yang sama diperbarui.

Kolom tambahan **Jenis Submit** dan **ID Pengiriman** membedakan submit manual/otomatis serta mencegah satu pengiriman yang sama ditulis dua kali.

## Kolom spreadsheet

Nama Peserta · Tugas · Waktu Submit · Tanggal Submit · Jam Submit · Status · Test Lolos · Total Test · Nilai Akhir · Rincian Pengujian · Kode C++ · Waktu Mulai · Sisa Waktu Saat Submit · Lama Pengerjaan · Jumlah Pelanggaran · Rincian Pelanggaran · Jenis Submit · ID Pengiriman.

## Deployment GitHub Pages

1. Push repository ke branch `main`.
2. Buka Settings → Pages.
3. Pilih GitHub Actions sebagai Build and deployment.
4. Workflow `.github/workflows/deploy.yml` menerbitkan isi root repository.

Aplikasi statis ini tidak membutuhkan npm, Vite, proses build, atau folder `dist`.

## Catatan data

Draft, progres, nama, timer, penalti, dan antrean pengiriman otomatis tertunda disimpan di localStorage browser. Jika siswa menggunakan browser/perangkat berbeda, data lokal tersebut tidak otomatis tersinkron. Nilai otomatis perlu ditinjau bersama source code siswa oleh guru.


## Panel pengujian STDIN / STDOUT

- **STDIN (Standard Input):** tempat siswa mengisi data yang akan dibaca oleh program melalui `cin` atau `getline()`. Format spasi dan baris baru sama-sama diterima.
- **STDOUT (Standard Output):** tempat melihat hasil yang ditampilkan program melalui `cout` setelah tombol **Run Code** ditekan.
- **TEST RESULTS:** tempat melihat hasil tiga test case otomatis setelah tombol **Check Tests** ditekan. Output setiap test case yang ditampilkan tersedia pada detail pengujian.


### Input/output standar dari sistem

Saat siswa memilih sebuah misi, kolom STDIN otomatis diisi dengan input dari test case publik pertama untuk misi tersebut. Sistem juga menampilkan STDOUT yang diharapkan sebagai pembanding. Siswa dapat mengubah input secara bebas; input terakhir disimpan per misi di browser. Tombol **Pulihkan standar** mengembalikan input bawaan dari sistem.
