/** Entry point Write Gateway. Deployment ini dipisahkan dari aplikasi client. */
function doPost(e) {
  try {
    const payload = gatewayParse_(e && e.postData ? e.postData.contents : '{}');
    const action = gatewayClean_(payload.action);
    gatewayAuthorize_(payload);
    gatewayRequireAction_(action, payload);

    let data;
    if (action === 'AUTH_LOOKUP_USER') data = gatewayLookupUserByEmail_(payload.email);
    else if (action === 'SPREADSHEET_APPEND') data = gatewayAppend_(payload.schoolId, payload.sheet, payload.row);
    else if (action === 'DRIVE_UPLOAD') data = gatewayUploadDrive_(payload.schoolId, payload);
    else if (action === 'PDF_CREATE') data = gatewayCreatePdf_(payload.schoolId, payload);
    else throw new Error('Action gateway tidak dikenali.');

    return gatewayOk_(data);
  } catch (e) {
    return gatewayFail_(e);
  }
}
