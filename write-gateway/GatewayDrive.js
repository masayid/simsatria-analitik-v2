/** Upload file ke Drive sekolah. payload: {folderId,name,mimeType,base64}. */
function gatewayUploadDrive_(schoolId, payload) {
  const folderId = payload.folderId || PropertiesService.getScriptProperties().getProperty('DRIVE_' + schoolId);
  if (!folderId) throw new Error('Folder Drive sekolah belum dikonfigurasi.');
  const folder = DriveApp.getFolderById(folderId);
  const blob = Utilities.newBlob(Utilities.base64Decode(payload.base64), payload.mimeType || 'application/octet-stream', payload.name || 'upload');
  const file = folder.createFile(blob);
  return { id:file.getId(), name:file.getName(), url:file.getUrl() };
}
