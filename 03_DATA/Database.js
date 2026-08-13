/** Database access layer - scaffold.
 * Prinsip: baca/tulis langsung ke spreadsheet sekolah sesuai akses pengguna.
 * Tidak menggunakan Write Gateway.
 */
function getSchoolSpreadsheet_() {
  const ctx = getSchoolContext_();
  if (!ctx.spreadsheetId) throw new Error('Spreadsheet sekolah belum dikonfigurasi.');
  return SpreadsheetApp.openById(ctx.spreadsheetId);
}
