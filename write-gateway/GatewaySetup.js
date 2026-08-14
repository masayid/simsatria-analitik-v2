/**
 * SIM SATRIA — WRITE GATEWAY SETUP
 *
 * FILE INI BERJALAN DI PROJECT WRITE GATEWAY, BUKAN DI PROJECT CLIENT.
 * Jalankan fungsi setupGatewaySchool2Allowlist() dari Apps Script Editor
 * project Gateway sebagai owner/setup administrator.
 *
 * Tujuan: membuat allow-list resource gateway di Script Properties milik
 * PROJECT GATEWAY. Ini berbeda dengan Script Properties project client.
 */

function setupGatewaySchool2Allowlist() {
  const schoolId = 'SMANTI03PWJ';
  const targetSheet = 'TRX_GATEWAY_TEST';

  // Validasi sekolah melalui MASTER yang memang dibaca oleh Gateway.
  const school = getSchoolConfig_(schoolId);
  gatewayRequire_(school && school.idSekolah === schoolId,
    'Konfigurasi sekolah Gateway tidak valid: ' + schoolId);

  const props = PropertiesService.getScriptProperties();
  props.setProperty('GATEWAY_SHEETS_' + schoolId, targetSheet);
  props.setProperty('DRIVE_' + schoolId, school.driveFolderId);

  // Pastikan target test benar-benar ada pada Spreadsheet sekolah.
  const ss = SpreadsheetApp.openById(school.spreadsheetId);
  let sheet = ss.getSheetByName(targetSheet);

  if (!sheet) {
    sheet = ss.insertSheet(targetSheet);
    sheet.getRange(1, 1, 1, 6).setValues([[
      'timestamp',
      'email',
      'school_id',
      'role',
      'action',
      'marker'
    ]]);
    sheet.setFrozenRows(1);
  }

  const result = {
    ok: true,
    schoolId: schoolId,
    spreadsheetId: school.spreadsheetId,
    driveFolderId: school.driveFolderId,
    allowedSheets: [targetSheet],
    targetSheetExists: !!sheet,
    message: 'Allow-list sekolah 2 berhasil disimpan pada PROJECT WRITE GATEWAY.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function setupGatewayCheckSchoolAllowlist(schoolId) {
  const id = gatewayClean_(schoolId).toUpperCase();
  gatewayRequire_(id, 'schoolId wajib diisi.');

  const configured = PropertiesService.getScriptProperties()
    .getProperty('GATEWAY_SHEETS_' + id) || '';

  const allowedSheets = configured
    .split(',')
    .map(gatewayClean_)
    .filter(Boolean);

  const result = {
    ok: true,
    schoolId: id,
    allowedSheets: allowedSheets,
    configured: allowedSheets.length > 0
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
