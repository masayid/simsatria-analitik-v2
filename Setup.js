/**
 * BOOTSTRAP / SETUP
 * Jalankan manual oleh owner aplikasi pada tahap instalasi awal.
 */
function setMasterSpreadsheetId(spreadsheetId) {
  requireValue_(spreadsheetId, 'MASTER_SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(clean_(spreadsheetId));
  PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP.MASTER_SPREADSHEET_ID, ss.getId());
  return ok_({ spreadsheetId: ss.getId(), name: ss.getName() }, 'MASTER_SPREADSHEET_ID tersimpan.');
}

function initializeSystem() {
  const result = initializeMaster_();
  return ok_({
    version: APP_CONFIG.VERSION,
    master: result.data,
    roles: APP_CONFIG.ROLE,
    permissions: APP_CONFIG.PERMISSION
  }, 'Bootstrap SIM SATRIA selesai.');
}

function getSystemStatus() {
  const props = PropertiesService.getScriptProperties();
  const masterId = props.getProperty(APP_CONFIG.PROP.MASTER_SPREADSHEET_ID);
  let masterName = '';
  if (masterId) {
    try { masterName = SpreadsheetApp.openById(masterId).getName(); } catch (e) { masterName = 'TIDAK DAPAT DIAKSES'; }
  }
  return ok_({
    app: APP_CONFIG.NAME,
    version: APP_CONFIG.VERSION,
    masterSpreadsheetId: masterId || '',
    masterSpreadsheetName: masterName,
    gatewayConfigured: !!props.getProperty(APP_CONFIG.PROP.GATEWAY_URL)
  });
}
