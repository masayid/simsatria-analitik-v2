/**
 * SIM SATRIA — KONFIGURASI WRITE GATEWAY SEKOLAH 2
 * Konfigurasi sekolah tetap dipertahankan untuk kebutuhan menu fungsional.
 * Fungsi pengujian sementara sudah dihapus.
 */

/**
 * Menyiapkan allow-list Write Gateway untuk sekolah kedua.
 * Jalankan sebagai SETUP_OWNER dari Apps Script Editor.
 */
function setup32_configureSchool2Gateway() {
  requireSetupAccess_();

  const schoolId = 'SMANTI03PWJ';
  const school = findSchoolById_(schoolId);

  if (!school) {
    throw new Error(
      'Sekolah tidak ditemukan atau tidak ACTIVE: ' + schoolId
    );
  }

  const spreadsheetId = clean_(school.spreadsheet_id);
  const driveFolderId = clean_(school.drive_folder_id);

  if (!spreadsheetId) {
    throw new Error(
      'Spreadsheet sekolah belum dikonfigurasi: ' + schoolId
    );
  }

  if (!driveFolderId) {
    throw new Error(
      'Drive folder sekolah belum dikonfigurasi: ' + schoolId
    );
  }

  const allowedSheets = ['TRX_GATEWAY_TEST'];
  const props = PropertiesService.getScriptProperties();

  props.setProperty(
    'GATEWAY_SHEETS_' + schoolId,
    allowedSheets.join(',')
  );

  props.setProperty(
    'DRIVE_' + schoolId,
    driveFolderId
  );

  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sh = ss.getSheetByName('TRX_GATEWAY_TEST');

  if (!sh) {
    sh = ss.insertSheet('TRX_GATEWAY_TEST');
    sh.getRange(1, 1, 1, 6).setValues([[
      'timestamp',
      'email',
      'school_id',
      'role',
      'action',
      'marker'
    ]]);
    sh.setFrozenRows(1);
  }

  const result = {
    ok: true,
    schoolId: schoolId,
    spreadsheetId: spreadsheetId,
    driveFolderId: driveFolderId,
    allowedSheets: allowedSheets,
    targetSheetExists: !!sh,
    message: 'Konfigurasi Write Gateway sekolah 2 siap digunakan.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/** Verifikasi konfigurasi Gateway sekolah 2. */
function setup31_verifySchool2GatewayConfig() {
  requireSetupAccess_();

  const schoolId = 'SMANTI03PWJ';
  const school = findSchoolById_(schoolId);

  if (!school) {
    throw new Error('Sekolah tidak ditemukan: ' + schoolId);
  }

  const cfg = getGatewayConfig_();
  const props = PropertiesService.getScriptProperties();

  const allowedSheets = (
    props.getProperty('GATEWAY_SHEETS_' + schoolId) || ''
  )
    .split(',')
    .map(function (v) {
      return clean_(v);
    })
    .filter(Boolean);

  const result = {
    ok: true,
    school: {
      idSekolah: clean_(school.id_sekolah).toUpperCase(),
      namaSekolah: clean_(school.nama_sekolah),
      spreadsheetId: clean_(school.spreadsheet_id),
      driveFolderId: clean_(school.drive_folder_id),
      status: clean_(school.status).toUpperCase()
    },
    gateway: {
      configured: !!(cfg.url && cfg.token),
      urlConfigured: !!cfg.url,
      tokenConfigured: !!cfg.token,
      allowedSheets: allowedSheets
    },
    message:
      'Konfigurasi Gateway sekolah 2 siap digunakan.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
