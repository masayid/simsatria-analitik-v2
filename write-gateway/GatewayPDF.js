/**
 * PDF generator gateway.
 *
 * SECURITY TAHAP 8.14:
 * - Target folder ditentukan HANYA dari schoolId yang sudah dipaksa
 *   oleh gateway-client berdasarkan session user.
 * - folderId/driveFolderId/targetFolderId dari payload DIABAIKAN.
 * - Metadata target dikembalikan agar client dapat melakukan verifikasi
 *   tanpa mencoba membaca file Drive sebagai user biasa.
 */
function gatewayCreatePdf_(schoolId, payload) {
  const effectiveSchoolId = gatewayClean_(schoolId).toUpperCase();
  gatewayRequire_(effectiveSchoolId, 'schoolId PDF wajib tersedia.');

  const folderId = PropertiesService.getScriptProperties()
    .getProperty('DRIVE_' + effectiveSchoolId);
  if (!folderId) throw new Error('Folder PDF sekolah belum dikonfigurasi.');

  const name = gatewayClean_(payload && payload.name) || 'laporan';
  const html = HtmlService.createHtmlOutput(
    (payload && payload.html) || '<p>Dokumen kosong</p>'
  ).getBlob().setName(name + '.html');

  const pdf = html.getAs(MimeType.PDF).setName(name + '.pdf');
  const file = DriveApp.getFolderById(folderId).createFile(pdf);

  return {
    schoolId: effectiveSchoolId,
    folderId: folderId,
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl()
  };
}
