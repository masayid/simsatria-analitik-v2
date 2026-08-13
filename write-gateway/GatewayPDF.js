/** PDF generator gateway; output selalu disimpan ke folder sekolah terdaftar. */
function gatewayCreatePdf_(schoolId, payload) {
  const folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_' + gatewayClean_(schoolId));
  if (!folderId) throw new Error('Folder PDF sekolah belum dikonfigurasi.');
  const name = gatewayClean_(payload && payload.name) || 'laporan';
  const html = HtmlService.createHtmlOutput((payload && payload.html) || '<p>Dokumen kosong</p>')
    .getBlob().setName(name + '.html');
  const pdf = html.getAs(MimeType.PDF).setName(name + '.pdf');
  const file = DriveApp.getFolderById(folderId).createFile(pdf);
  return { id: file.getId(), name: file.getName(), url: file.getUrl() };
}
