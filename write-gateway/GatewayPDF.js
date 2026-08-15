/**
 * PDF generator gateway.
 *
 * SECURITY:
 * - Target folder ditentukan HANYA dari schoolId yang sudah dipaksa
 *   oleh gateway-client berdasarkan session user.
 * - folderId dari payload client diabaikan.
 * - PDF TIDAK dibuat public.
 * - PDF dibagikan hanya kepada recipientEmail user yang sedang login.
 *
 * Alur:
 *   Guru/User klik Cetak -> Web App mengenali akun Google aktif
 *   -> pdfViaGateway_ mengirim recipientEmail ke Gateway
 *   -> Gateway membuat PDF di folder sekolah
 *   -> Gateway memberi hak VIEW hanya ke akun tersebut
 *   -> URL dikembalikan dan langsung dibuka pada tab baru.
 */
function gatewayCreatePdf_(schoolId, payload) {
  const effectiveSchoolId = gatewayClean_(schoolId).toUpperCase();
  gatewayRequire_(effectiveSchoolId, 'schoolId PDF wajib tersedia.');

  const recipientEmail = gatewayClean_(payload && payload.recipientEmail).toLowerCase();
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    throw new Error('Akun Google penerima PDF tidak valid.');
  }

  const folderId = PropertiesService.getScriptProperties()
    .getProperty('DRIVE_' + effectiveSchoolId);
  if (!folderId) throw new Error('Folder PDF sekolah belum dikonfigurasi.');

  const name = gatewayClean_(payload && payload.name) || 'laporan';
  const html = HtmlService.createHtmlOutput(
    (payload && payload.html) || '<p>Dokumen kosong</p>'
  ).getBlob().setName(name + '.html');

  const pdf = html.getAs(MimeType.PDF).setName(name + '.pdf');
  const file = DriveApp.getFolderById(folderId).createFile(pdf);

  // Jangan gunakan ANYONE_WITH_LINK.
  // File hanya dibagikan kepada akun Google user yang sedang login.
  try {
    file.addViewer(recipientEmail);
  } catch (sharingError) {
    try {
      file.setTrashed(true);
    } catch (ignore) {}
    throw new Error(
      'PDF berhasil dibuat tetapi tidak dapat dibagikan ke akun Google ' +
      recipientEmail + '. Pastikan akun tersebut aktif dan dapat menerima file Drive.'
    );
  }

  return {
    schoolId: effectiveSchoolId,
    folderId: folderId,
    id: file.getId(),
    name: file.getName(),
    recipientEmail: recipientEmail,
    access: 'USER_ONLY_VIEW',
    url: 'https://drive.google.com/file/d/' + file.getId() + '/view'
  };
}
