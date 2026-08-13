/** PDF generator gateway. payload: {html,name,folderId}. */
function gatewayCreatePdf_(schoolId, payload) {
  const folderId = payload.folderId || PropertiesService.getScriptProperties().getProperty('DRIVE_' + schoolId);
  if (!folderId) throw new Error('Folder PDF sekolah belum dikonfigurasi.');
  const html = HtmlService.createHtmlOutput(payload.html || '<p>Dokumen kosong</p>').getBlob().setName((payload.name || 'laporan') + '.html');
  const pdf = html.getAs(MimeType.PDF).setName((payload.name || 'laporan') + '.pdf');
  const file = DriveApp.getFolderById(folderId).createFile(pdf);
  return { id:file.getId(), name:file.getName(), url:file.getUrl() };
}
