/**
 * SIM SATRIA Multi Sekolah — TAHAP 6 RUNNER
 * Jalankan dari Apps Script Editor sebagai SETUP_OWNER.
 */

/** TAHAP 6.1 — Terapkan akses storage berdasarkan role. */
function setup11_applyStorageAccess() {
  const schoolId = 'SMANDA2SKJ';
  const result = applyStorageAccessForSchool(schoolId);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/** TAHAP 6.2 — Verifikasi akses storage. */
function setup12_verifyStorageAccess() {
  const schoolId = 'SMANDA2SKJ';
  const result = verifyStorageAccessForSchool(schoolId);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
