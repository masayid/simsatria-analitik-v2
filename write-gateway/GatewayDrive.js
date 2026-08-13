/** Upload file ke folder Drive sekolah yang sudah dikonfigurasi gateway. */
function gatewayUploadDrive_(schoolId, payload) {
  const folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_' + gatewayClean_(schoolId));
  if (!folderId) throw new Error('Folder Drive sekolah belum dikonfigurasi.');
  if (!payload || !payload.base64) throw new Error('Data file base64 wajib dikirim.');

  const folder = DriveApp.getFolderById(folderId);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(payload.base64),
    payload.mimeType || 'application/octet-stream',
    payload.name || 'upload'
  );
  const file = folder.createFile(blob);
  return { id: file.getId(), name: file.getName(), url: file.getUrl() };
}
