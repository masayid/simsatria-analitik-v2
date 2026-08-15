/**
 * PDF generator gateway.
 *
 * SECURITY:
 * - Target folder ditentukan HANYA dari schoolId yang sudah dipaksa
 *   oleh gateway-client berdasarkan session user.
 * - folderId dari payload client diabaikan.
 * - PDF dibagikan sebagai Anyone with the link agar hasil cetak dapat
 *   langsung dibuka pada tab baru tanpa dialog Request access.
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

  // Hasil PDF harus dapat dibuka langsung dari tab baru tanpa meminta
  // pengguna melakukan Request access. Hak akses hanya VIEW.
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingError) {
    // Jika kebijakan Google Workspace sekolah melarang public link,
    // jangan diam-diam mengembalikan URL yang pasti meminta akses.
    throw new Error(
      'PDF berhasil dibuat, tetapi akses link publik diblokir oleh kebijakan Google Workspace. ' +
      'Izinkan "Anyone with the link" pada Drive sekolah agar PDF dapat dibuka tanpa Request access.'
    );
  }

  return {
    schoolId: effectiveSchoolId,
    folderId: folderId,
    id: file.getId(),
    name: file.getName(),
    url: 'https://drive.google.com/file/d/' + file.getId() + '/view?usp=sharing'
  };
}
