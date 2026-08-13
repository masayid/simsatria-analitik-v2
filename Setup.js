/**
 * SIM SATRIA Multi Sekolah — SETUP RUNNER
 *
 * File ini sengaja berisi fungsi publik yang mudah dipilih dari
 * dropdown Run pada Apps Script Editor.
 *
 * Fungsi inti tetap menggunakan suffix _ sebagai internal/private.
 * Operator TIDAK perlu menjalankan fungsi berakhiran _ secara langsung.
 */

/**
 * LANGKAH 1 — simpan ID Spreadsheet MASTER.
 * Jalankan manual dari Apps Script Editor.
 *
 * Contoh:
 * setMasterSpreadsheetId('1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
 */
function setMasterSpreadsheetId(spreadsheetId) {
  return setMasterSpreadsheetId_(spreadsheetId);
}

/**
 * LANGKAH 2 — tetapkan email operator/owner MASTER.
 * Jalankan manual dari Apps Script Editor.
 *
 * Contoh:
 * setSetupOwnerEmail('admin@sekolah.sch.id');
 */
function setSetupOwnerEmail(email) {
  return setSetupOwnerEmail_(email);
}

/**
 * LANGKAH 3 — buat seluruh MASTER_* dan seed data awal.
 * Jalankan manual setelah MASTER_SPREADSHEET_ID dan SETUP_OWNER_EMAIL tersedia.
 */
function initializeSystem() {
  return initializeSystem_();
}

/**
 * Pemeriksaan konfigurasi setup.
 */
function checkSetup() {
  return getSetupStatus();
}

/**
 * Pemeriksaan kondisi aplikasi dan gateway.
 */
function checkSystem() {
  return getSystemStatus();
}

/**
 * RESET DARURAT — hanya dijalankan manual oleh operator dari Apps Script Editor.
 * Tidak digunakan dalam operasi normal.
 */
function resetSetupOwnerEmail() {
  return resetSetupOwnerEmail_();
}
