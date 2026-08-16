/**
 * Entry point Write Gateway.
 *
 * Deployment Gateway WAJIB:
 * - Execute as: Me / owner project Gateway.
 * - Who has access: Anyone with Google account (atau Anyone, sesuai
 *   kebijakan deployment).
 *
 * Web App utama SIM SATRIA tetap boleh Execute as: User accessing the web app.
 * Gateway berbeda: Gateway harus berjalan sebagai owner agar ADMIN_SEKOLAH
 * tidak perlu memiliki akses langsung ke project Gateway.
 *
 * Gateway ini hanya melayani request POST dari Web App SIM SATRIA.
 * Tidak ada doGet() agar URL Gateway tidak digunakan sebagai halaman aplikasi.
 */

function doPost(e) {
  try {
    const payload = gatewayParse_(e && e.postData ? e.postData.contents : '{}');
    const action = gatewayClean_(payload.action);
    gatewayAuthorize_(payload);
    gatewayRequireAction_(action, payload);

    let data;
    if (action === 'AUTH_LOOKUP_USER') data = gatewayLookupUserByEmail_(payload.email);
    else if (action === 'SPREADSHEET_ENSURE_SHEET') data = gatewayEnsureSheet_(payload.schoolId, payload.sheet, payload.headers);
    else if (action === 'SPREADSHEET_APPEND') data = gatewayAppend_(payload.schoolId, payload.sheet, payload.row);
    else if (action === 'SPREADSHEET_UPDATE_ROW') data = gatewayUpdateRow_(payload.schoolId, payload.sheet, payload.rowNumber, payload.row);
    else if (action === 'SPREADSHEET_DELETE_ROW') data = gatewayDeleteRow_(payload.schoolId, payload.sheet, payload.rowNumber);
    else if (action === 'SPREADSHEET_READ') data = gatewayReadSheet_(payload.schoolId, payload.sheet);
    else if (action === 'DRIVE_UPLOAD') data = gatewayUploadDrive_(payload.schoolId, payload);
    else if (action === 'PDF_CREATE') data = gatewayCreatePdf_(payload.schoolId, payload);
    else throw new Error('Action gateway tidak dikenali.');

    return gatewayOk_(data);
  } catch (e) {
    return gatewayFail_(e);
  }
}
