# C++ Mission Lab — ICT Class

Platform latihan praktik C++ untuk siswa SMP. Berisi **10 misi tingkat Hard dengan integrasi seluruh materi C++**, compiler C++20 WebAssembly, CodeMirror, STDIN, pengujian otomatis, timer per sesi, proteksi pelanggaran, dan integrasi Google Spreadsheet.

## Alur siswa

1. Siswa memasukkan nama lengkap dan menekan **Mulai Sesi**.
2. Siswa mendapat waktu **60 menit** untuk berlatih. Tidak ada deadline bersama.
3. Sepuluh misi dapat dipilih dan dikerjakan dalam satu sesi. Setiap misi memiliki tiga skenario test.
4. Siswa dapat menekan **Reset Sesi** untuk memulai jatah 60 menit baru. Draft kode dan progres misi tetap tersimpan.
5. Setiap pelanggaran yang terdeteksi mengurangi waktu lima menit. Semua proteksi tetap aktif pada sesi yang baru.
6. Jika waktu habis, sesi dan editor dikunci. Kode pada misi yang sedang terbuka diuji otomatis dan dikirim ke Google Spreadsheet dengan jenis submit `OTOMATIS - WAKTU HABIS`.
7. Setiap klik **Run Code** dan **Check Tests** juga dicatat ke Google Spreadsheet. Log menyimpan jenis aktivitas, kode multi-file, input/output, status eksekusi, durasi, dan rincian test.
8. Siswa dapat mengirim hasil penilaian melalui tombol **Submit Mission**. Pengiriman manual dan otomatis tetap dibedakan dari log Run Code / Check Tests.
9. Gunakan tombol **Ganti Peserta** untuk mengakhiri sesi peserta saat ini dan memulai sesi dengan nama berbeda tanpa menghapus data melalui Developer Tools.

## Daftar 10 misi

| No. | Misi | Tingkat | Konteks utama |
|---:|---|---|---|
| 1 | Smart Canteen | Hard | Kasir multi-pelanggan, diskon bertingkat, QRIS |
| 2 | Smart Parking Gate | Hard | Laporan parkir, tarif kendaraan, diskon member |
| 3 | Rekap Nilai Akademik | Hard | Array nilai, bobot, predikat, remedial |
| 4 | ATM Simulator | Hard | Tiga transaksi per nasabah, validasi saldo |
| 5 | Smart Courier | Hard | Paket, zona jarak, ekspres, asuransi |
| 6 | Theme Park Ticketing | Hard | Kelayakan usia/tinggi, diskon kelompok |
| 7 | Robot Tournament Scoring | Hard | Tiga ronde, penalti, predikat, kelulusan |
| 8 | Warehouse Stock Control | Hard | Persediaan, barang keluar, status restok |
| 9 | Internet Plan Billing | Hard | Paket, kuota berlebih, diskon pelanggan |
| 10 | Festival Ticketing System | Hard | Kategori tiket, diskon member, biaya QRIS |

Seluruh misi disusun setara dengan LKPD integrasi C++ dan menggunakan tiga test case (satu publik dan dua tersembunyi). Setiap misi mewajibkan array sejajar maksimal lima data, function untuk input/perhitungan/status/laporan/ringkasan, scope global dan lokal, object string dengan method length(), find(), substr(), dan append(), serta getline() untuk teks yang mengandung spasi. Program langsung menampilkan menu tanpa meminta jumlah data di awal. Setiap pilihan Input Data menambahkan satu data hingga kapasitas lima. Struktur kontrol yang wajib digunakan adalah while(true) untuk mengulang menu sampai pilihan Keluar, do-while untuk meminta ulang pilihan menu yang tidak valid, for untuk membaca dan menampilkan array, switch-case untuk menu, serta if bersarang untuk keputusan. Tidak diperbolehkan membuat class sendiri, nested loop, file, vector, pointer, atau library tambahan.

## Editor multi-file

Enam misi menggunakan dua file yang dapat dibuka melalui tab di atas editor:
- Smart Courier: `main.cpp` dan `courier.h`
- Theme Park Ticketing: `main.cpp` dan `ticket_rules.h`
- Robot Tournament Scoring: `main.cpp` dan `scoring.h`
- Warehouse Stock Control: `main.cpp` dan `inventory.h`
- Internet Plan Billing: `main.cpp` dan `billing.h`
- Festival Ticketing System: `main.cpp` dan `festival.h`

File header dikirim ke compiler WebAssembly sebagai `extraFiles` sehingga dapat dipakai dengan `#include "nama_file.h"` pada `main.cpp`. Draft disimpan per file di browser. Run Code dan Check Tests mengompilasi `main.cpp` bersama file header yang sesuai. Saat submit, isi semua file disatukan pada kolom Kode C++ dengan penanda nama file. Empat misi lainnya tetap menggunakan satu file `main.cpp`.

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

- Compiler: `browsercc@0.1.1` (Clang C++20 → WebAssembly).
- Runtime: `@bjorn3/browser_wasi_shim@0.4.2`.

- **Kompatibilitas Arduino:** C++20 di Mission Labs berlaku untuk compiler WebAssembly di browser. Arduino Uno/Nano dengan toolchain AVR standar biasanya memakai standar yang lebih lama; jangan menganggap semua fitur C++20 dapat langsung dipindahkan ke sketch Arduino.
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

Kolom **Jenis Aktivitas**, **STDIN**, **STDOUT**, dan **Durasi Eksekusi (ms)** mencatat setiap Run Code dan Check Tests. Kolom **Jenis Submit** tetap membedakan pengiriman manual/otomatis. **ID Pengiriman** mencegah satu event tercatat dua kali. Header baru ditambahkan secara otomatis tanpa menghapus data lama. Sebelum mengirim log aktivitas, frontend memeriksa schemaVersion backend; bila Apps Script belum diperbarui, log tetap di antrean browser dan tidak dikirim ke backend lama.

## Kolom spreadsheet

Nama Peserta · Tugas · Waktu Submit · Tanggal Submit · Jam Submit · Status · Test Lolos · Total Test · Nilai Akhir · Rincian Pengujian · Kode C++ · Waktu Mulai · Sisa Waktu Saat Submit · Lama Pengerjaan · Jumlah Pelanggaran · Rincian Pelanggaran · Jenis Aktivitas · STDIN · STDOUT · Durasi Eksekusi (ms) · Jenis Submit · ID Pengiriman.

## Deployment GitHub Pages

1. Push repository ke branch `main`.
2. Buka Settings → Pages.
3. Pilih GitHub Actions sebagai Build and deployment.
4. Workflow `.github/workflows/deploy.yml` menerbitkan isi root repository.

Aplikasi statis ini tidak membutuhkan npm, Vite, proses build, atau folder `dist`.

## Catatan data

Draft, progres, input standar, timer, dan penalti disimpan terpisah berdasarkan nama peserta di localStorage browser. Tombol **Ganti Peserta** membuka sesi baru dengan timer dan penalti baru tanpa membawa draft/progres peserta sebelumnya. Antrean pengiriman tertunda tetap disimpan bersama perangkat agar submission lama dapat dikirim ulang. Jika siswa menggunakan browser/perangkat berbeda, data lokal tidak otomatis tersinkron. Nilai otomatis perlu ditinjau bersama source code siswa oleh guru.


## Panel pengujian STDIN / STDOUT

- **Run Code:** pada browser yang mendukung `SharedArrayBuffer`, terminal menunggu setiap kali program mencapai `cin` atau `getline()`. Kolom input terkunci saat program sedang berjalan dan baru aktif ketika program benar-benar meminta data. Setelah satu baris dikirim, program melanjutkan hingga permintaan input berikutnya. Tombol **EOF** menutup input standar. Jika browser tidak mendukung isolasi lintas-origin, panel STDIN manual menjadi mode cadangan.
- **STDOUT:** output dari `cout` dan `cerr` tampil langsung di terminal selama program berjalan.
- **Check Tests:** tetap menggunakan tiga input otomatis dari sistem; siswa tidak perlu mengetik ulang input untuk pengujian.
- Setiap Run Code dan Check Tests tetap dicatat ke Google Sheets. STDIN pada log Run Code berisi baris yang benar-benar diketik siswa.


### Input/output standar dari sistem

Pada mode terminal interaktif, siswa tidak perlu menyiapkan STDIN sebelum Run Code. Program berjalan sampai selesai atau meminta input; setiap baris dikirim dari terminal secara langsung. Pada mode cadangan, STDIN manual dimulai kosong dan input yang ditulis siswa disimpan per misi di browser. Test case publik tetap digunakan oleh Check Tests, bukan sebagai input otomatis untuk Run Code.



Run Code uses an interactive terminal when the browser supports cross-origin isolation: the program can request multiple input lines from the student while it is running. Manual STDIN is an empty fallback for browsers without SharedArrayBuffer. Check Tests continues to run the mission's automatic test inputs. The target output and exact labels to be validated are written directly in each mission's Challenge Brief under 'Ringkasan yang harus ditampilkan'.


## Auto-save kode siswa

- Setiap perubahan dokumen editor CodeMirror langsung disimpan ke localStorage browser.
- Draft setiap misi juga disimpan pada kunci terpisah, di luar objek progres utama, sebagai cadangan jika penyimpanan progres utama bermasalah.
- Draft disimpan lagi ketika halaman masuk ke background, ditutup, atau direfresh.
- Saat halaman dibuka kembali, kode terakhir dipulihkan untuk setiap misi.
- Draft tetap ada setelah Reset Sesi; reset hanya memulai timer dan catatan penalti baru.
- Penyimpanan ini berlaku pada browser/perangkat yang sama. Menghapus data situs, membuka profil browser berbeda, atau berpindah perangkat dapat menghilangkan akses ke draft lokal.

## Proyek multi-file

Enam misi lanjutan menyediakan dua tab file: `main.cpp` dan satu file header `.h`. Siswa mengerjakan program utama di `main.cpp`, menulis fungsi pendukung di file header, lalu memanggilnya dengan `#include "nama_file.h"`. File header dikirim ke compiler sebagai `extraFiles`, sehingga ikut dipakai pada Run Code dan seluruh test case. Draft setiap file disimpan terpisah pada browser. Saat Submit Mission atau pengiriman otomatis, isi semua file dikemas bersama nama filenya pada kolom Kode C++.

Misi lainnya tetap hanya menggunakan `main.cpp`. Tombol Reset pada misi multi-file mengembalikan semua file ke template awal.
