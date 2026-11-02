/*
 * C++ MISSION LAB — RULES CONFIGURATION
 * File ini mengatur proteksi selama sesi siswa.
 *
 * MODE DEVELOPMENT:
 *   restrictClipboard: false
 *   penalizeTabSwitch: false
 *   penalizeContextMenu: false
 *   penalizeSystemShortcuts: false
 *
 * MODE EXAM:
 *   Ubah ke true untuk mengaktifkan kembali aturan.
 *
 * Setelah mengubah file ini, commit/push ke GitHub.
 * Tidak perlu mengubah js/app.js.
 */
window.MISSION_RULES = Object.freeze({
  // false = siswa/developer boleh copy, cut, paste dan memilih teks soal.
  restrictClipboard: true,

  // false = berpindah tab atau membuka tab lain tidak mengurangi waktu.
  penalizeTabSwitch: true,

  // false = klik kanan / menu konteks tidak dikenai penalti.
  penalizeContextMenu: true,

  // false = shortcut screenshot, print, dan Developer Tools tidak dikenai penalti.
  penalizeSystemShortcuts: true,

  // Besar potongan untuk setiap pelanggaran yang terdeteksi.
  penaltyMinutes: 5
});
