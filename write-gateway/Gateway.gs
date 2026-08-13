/** Entry point Write Gateway. Deployment ini dipisahkan dari aplikasi client. */
function doPost(e) {
  try {
    const payload = safeJsonParse_(e && e.postData ? e.postData.contents : '{}');
    gatewayAuthorize_(payload);
    const action = clean_(payload.action);
    gatewayRequireAction_(action);
    let data;
    if (action === 'SPREADSHEET_APPEND') data = gatewayAppend_(payload.schoolId, payload.sheet, payload.row);
    else if (action === 'DRIVE_UPLOAD') data = gatewayUploadDrive_(payload.schoolId, payload);
    else if (action === 'PDF_CREATE') data = gatewayCreatePdf_(payload.schoolId, payload);
    return gatewayOk_(data);
  } catch (e) { return gatewayFail_(e); }
}
