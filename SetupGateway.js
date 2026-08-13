/**
 * SIM SATRIA — TAHAP 7 WRITE GATEWAY RUNNER
 * Jalankan fungsi setup sebagai SETUP_OWNER dari Apps Script Editor.
 */

function setup13_generateGatewayToken() {
  requireSetupAccess_();
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP.GATEWAY_TOKEN, token);
  PropertiesService.getScriptProperties().setProperty('GATEWAY_TOKEN_CREATED_AT', new Date().toISOString());
  return ok_({configured: true}, 'GATEWAY_TOKEN berhasil dibuat. Token tidak ditampilkan.');
}

function setup14_setGatewayUrl(url) {
  requireSetupAccess_();
  const value = clean_(url);
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec$/.test(value)) {
    throw new Error('URL gateway harus berupa URL Web App Apps Script berakhiran /exec.');
  }
  PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP.GATEWAY_URL, value);
  return ok_({url: value}, 'GATEWAY_URL tersimpan.');
}

function setup15_configureGatewaySchool() {
  requireSetupAccess_();
  const schoolId = clean_(SETUP_CONFIG.SEKOLAH.id_sekolah).toUpperCase();
  const school = findSchoolById_(schoolId);
  if (!school) throw new Error('Sekolah belum terdaftar/ACTIVE: ' + schoolId);

  const sheets = ['TRX_GATEWAY_TEST'];
  PropertiesService.getScriptProperties().setProperty('GATEWAY_SHEETS_' + schoolId, sheets.join(','));
  // Kompatibilitas dengan GatewayPDF.js yang sudah ada di project.
  PropertiesService.getScriptProperties().setProperty('DRIVE_' + schoolId, school.drive_folder_id);

  const ss = SpreadsheetApp.openById(school.spreadsheet_id);
  let sh = ss.getSheetByName('TRX_GATEWAY_TEST');
  if (!sh) {
    sh = ss.insertSheet('TRX_GATEWAY_TEST');
    sh.getRange(1, 1, 1, 5).setValues([['timestamp','email','action','message','status']]);
    sh.setFrozenRows(1);
  }

  return ok_({schoolId: schoolId, allowedSheets: sheets}, 'Konfigurasi gateway sekolah siap diuji.');
}

function setup16_testGatewayInput() {
  const menu = SETUP_CONFIG.MENU_UJI.kode_menu;
  return saveDataViaGateway(menu, 'TRX_GATEWAY_TEST', [
    new Date(),
    Session.getActiveUser().getEmail(),
    'SPREADSHEET_APPEND',
    'TEST WRITE GATEWAY',
    'OK'
  ]);
}

function setup17_checkGatewayConfig() {
  const p = PropertiesService.getScriptProperties();
  const schoolId = clean_(SETUP_CONFIG.SEKOLAH.id_sekolah).toUpperCase();
  return ok_({
    gatewayUrlConfigured: !!p.getProperty(APP_CONFIG.PROP.GATEWAY_URL),
    gatewayTokenConfigured: !!p.getProperty(APP_CONFIG.PROP.GATEWAY_TOKEN),
    allowedSheets: p.getProperty('GATEWAY_SHEETS_' + schoolId) || '',
    schoolId: schoolId
  });
}
