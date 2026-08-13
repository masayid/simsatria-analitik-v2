/** Upload file ke folder Drive sekolah dari MASTER_SEKOLAH. */
function gatewayUploadDrive_(schoolId, payload) {
  gatewayRequire_(payload && payload.base64, 'Data file base64 wajib dikirim.');
  const blob = gatewayBase64ToBlob_(payload.base64, payload.mimeType, payload.name);
  const folder = gatewayGetFolder_(schoolId);
  const file = folder.createFile(blob);
  return {
    schoolId: gatewayClean_(schoolId).toUpperCase(),
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl()
  };
}
