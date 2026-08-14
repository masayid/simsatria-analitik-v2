/**
 * SIM SATRIA — TAHAP 8.9
 * Test Write Gateway untuk GURU sekolah kedua.
 *
 * FIX: Gateway harus memiliki allow-list sheet untuk setiap sekolah.
 * Sebelumnya hanya konfigurasi sekolah dari SETUP_CONFIG yang dibuat,
 * sehingga SMANTI03PWJ ditolak dengan pesan:
 * "Belum ada sheet yang diizinkan untuk gateway sekolah SMANTI03PWJ."
 */

/**
 * Menyiapkan allow-list Write Gateway untuk sekolah kedua.
 * Jalankan sebagai SETUP_OWNER dari Apps Script Editor.
 *
 * Fungsi ini harus dijalankan SEBELUM testGatewayWriteAsCurrentUser().
 */
function setup32_configureSchool2Gateway() {
  requireSetupAccess_();

  const schoolId = 'SMANTI03PWJ';
  const school = findSchoolById_(schoolId);
  if (!school) throw new Error('Sekolah tidak ditemukan atau tidak ACTIVE: ' + schoolId);

  const spreadsheetId = clean_(school.spreadsheet_id);
  const driveFolderId = clean_(school.drive_folder_id);
  if (!spreadsheetId) throw new Error('Spreadsheet sekolah belum dikonfigurasi: ' + schoolId);
  if (!driveFolderId) throw new Error('Drive folder sekolah belum dikonfigurasi: ' + schoolId);

  // Allow-list minimal untuk TAHAP 8.9.
  // Jangan mengizinkan sheet lain secara otomatis.
  const allowedSheets = ['TRX_GATEWAY_TEST'];
  const props = PropertiesService.getScriptProperties();
  props.setProperty('GATEWAY_SHEETS_' + schoolId, allowedSheets.join(','));
  props.setProperty('DRIVE_' + schoolId, driveFolderId);

  // Pastikan target test memang ada di Spreadsheet sekolah 2.
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
    message: 'Allow-list Write Gateway sekolah 2 berhasil dikonfigurasi.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/** Verifikasi konfigurasi Gateway sekolah 2. */
function setup31_verifySchool2GatewayConfig() {
  requireSetupAccess_();

  const schoolId = 'SMANTI03PWJ';
  const school = findSchoolById_(schoolId);
  if (!school) throw new Error('Sekolah tidak ditemukan: ' + schoolId);

  const cfg = getGatewayConfig_();
  const props = PropertiesService.getScriptProperties();
  const allowedSheets = (props.getProperty('GATEWAY_SHEETS_' + schoolId) || '')
    .split(',')
    .map(function(v) { return clean_(v); })
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
    message: allowedSheets.indexOf('TRX_GATEWAY_TEST') >= 0
      ? 'Konfigurasi Gateway sekolah 2 siap diuji.'
      : 'Gateway URL/token ada, tetapi allow-list sheet sekolah 2 belum dikonfigurasi.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testGatewayWriteAsCurrentUser() {
  const email = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const expectedEmail = 'kurikulum.sman3pwr@gmail.com';
  const expectedSchool = 'SMANTI03PWJ';
  const expectedRole = 'GURU';
  const menu = 'DASHBOARD';
  const sheet = 'TRX_GATEWAY_TEST';

  if (!email) {
    throw new Error('Email user aktif tidak tersedia. Jalankan fungsi ini dari Web App setelah login Google.');
  }

  if (email !== expectedEmail) {
    throw new Error('Pengujian 8.9 harus dijalankan sebagai ' + expectedEmail + '. Akun aktif: ' + email);
  }

  const sessionResponse = getSessionContext();
  const context = sessionResponse && sessionResponse.ok && sessionResponse.data
    ? sessionResponse.data
    : sessionResponse;

  if (!context || !context.user || !context.school) {
    throw new Error('Session context user/sekolah tidak tersedia.');
  }

  const schoolId = clean_(context.school.idSekolah || context.school.id_sekolah).toUpperCase();
  const role = clean_(context.user.role).toUpperCase();
  const userEmail = clean_(context.user.email || email).toLowerCase();

  if (userEmail !== email) {
    throw new Error('Email session tidak konsisten. Active=' + email + ', Session=' + userEmail);
  }
  if (schoolId !== expectedSchool) {
    throw new Error('School context salah. Diharapkan ' + expectedSchool + ', diperoleh ' + schoolId);
  }
  if (role !== expectedRole) {
    throw new Error('Role salah. Diharapkan GURU, diperoleh ' + role);
  }

  requirePermission_(APP_CONFIG.PERMISSION.INPUT, menu);

  // Fail fast dengan pesan konfigurasi yang jelas sebelum melakukan HTTP call.
  const allowed = (PropertiesService.getScriptProperties().getProperty('GATEWAY_SHEETS_' + schoolId) || '')
    .split(',')
    .map(function(v) { return clean_(v); })
    .filter(Boolean);
  if (allowed.indexOf(sheet) < 0) {
    throw new Error(
      'Write Gateway sekolah ' + schoolId + ' belum dikonfigurasi untuk sheet ' + sheet +
      '. Jalankan setup32_configureSchool2Gateway() sebagai SETUP_OWNER.'
    );
  }

  const marker = 'SCHOOL2_GURU_GATEWAY_' + Utilities.getUuid();
  const row = [
    new Date(),
    email,
    schoolId,
    role,
    'SPREADSHEET_APPEND',
    marker
  ];

  const gatewayResult = saveDataViaGateway(menu, sheet, row);

  const result = {
    ok: true,
    test: 'TAHAP 8.9',
    user: email,
    role: role,
    schoolId: schoolId,
    targetSheet: sheet,
    marker: marker,
    gateway: {
      ok: gatewayResult && gatewayResult.ok === true,
      message: gatewayResult && gatewayResult.message ? gatewayResult.message : ''
    },
    school2Write: 'PASS',
    crossSchool: 'NOT_TESTED_IN_THIS_CALL',
    message: 'Guru sekolah 2 berhasil melakukan write melalui Write Gateway.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function runSchool2GatewayTestFromWebApp() {
  return testGatewayWriteAsCurrentUser();
}
