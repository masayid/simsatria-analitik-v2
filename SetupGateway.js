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

function setup18_testGatewayUpload() {
  const menu = SETUP_CONFIG.MENU_UJI.kode_menu;
  const schoolId = clean_(SETUP_CONFIG.SEKOLAH.id_sekolah).toUpperCase();
  const email = Session.getActiveUser().getEmail() || '';
  const timestamp = new Date();
  const fileName = 'TEST_GATEWAY_UPLOAD_' + Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '.txt';
  const content = [
    'SIM SATRIA — TEST WRITE GATEWAY UPLOAD',
    'schoolId: ' + schoolId,
    'email: ' + email,
    'timestamp: ' + timestamp.toISOString(),
    'status: OK'
  ].join('\n');
  const blob = Utilities.newBlob(content, 'text/plain', fileName);
  const payload = {
    name: fileName,
    mimeType: 'text/plain',
    base64: Utilities.base64Encode(blob.getBytes())
  };
  const result = uploadViaGateway(menu, payload);
  return ok_({
    action: 'DRIVE_UPLOAD',
    schoolId: schoolId,
    fileId: result.id || '',
    fileName: result.name || fileName,
    fileUrl: result.url || ''
  }, 'TEST UPLOAD berhasil melalui Write Gateway.');
}

function setup19_testGatewayPDF() {
  const menu = SETUP_CONFIG.MENU_UJI.kode_menu;
  const schoolId = clean_(SETUP_CONFIG.SEKOLAH.id_sekolah).toUpperCase();
  const email = Session.getActiveUser().getEmail() || '';
  const timestamp = new Date();
  const stamp = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const fileName = 'TEST_GATEWAY_PDF_' + stamp;
  const html = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>',
    'body{font-family:Arial,sans-serif;padding:36px;color:#222}',
    'h1{font-size:22px;margin-bottom:20px}',
    'table{border-collapse:collapse;width:100%}',
    'td{border:1px solid #ccc;padding:8px}',
    '.label{font-weight:bold;width:180px}',
    '</style></head><body>',
    '<h1>SIM SATRIA — TEST WRITE GATEWAY PDF</h1>',
    '<table>',
    '<tr><td class="label">Status</td><td>OK</td></tr>',
    '<tr><td class="label">Sekolah</td><td>' + escapeHtml_(schoolId) + '</td></tr>',
    '<tr><td class="label">User</td><td>' + escapeHtml_(email) + '</td></tr>',
    '<tr><td class="label">Waktu</td><td>' + escapeHtml_(timestamp.toISOString()) + '</td></tr>',
    '</table></body></html>'
  ].join('');
  const result = pdfViaGateway(menu, {name: fileName, html: html});
  return ok_({
    action: 'PDF_CREATE',
    schoolId: schoolId,
    fileId: result.id || '',
    fileName: result.name || (fileName + '.pdf'),
    fileUrl: result.url || ''
  }, 'TEST PDF berhasil melalui Write Gateway.');
}

/**
 * TAHAP 7.5 — Security / Cross-School Isolation Test.
 * Semua test bersifat negative test: keberhasilan berarti request DITOLAK.
 * Tidak melakukan write ke sekolah kedua.
 *
 * Untuk test cross-school, isi Script Property:
 * SECURITY_TEST_SCHOOL_ID_2 = ID sekolah kedua yang ACTIVE.
 */
function setup20_testGatewaySecurity() {
  const schoolId = clean_(SETUP_CONFIG.SEKOLAH.id_sekolah).toUpperCase();
  const cfg = getGatewayConfig_();
  if (!cfg.url || !cfg.token) {
    throw new Error('Gateway URL/token belum dikonfigurasi.');
  }

  const results = {
    schoolId: schoolId,
    tokenSalah: null,
    schoolPalsu: null,
    sheetIlegal: null,
    crossSchool: null
  };

  results.tokenSalah = gatewaySecurityNegativeTest_(
    'TOKEN_SALAH',
    Object.assign({}, {
      action: 'SPREADSHEET_APPEND',
      schoolId: schoolId,
      token: cfg.token + '_SALAH',
      sheet: 'TRX_GATEWAY_TEST',
      row: [new Date(), 'SECURITY_TEST', 'TOKEN_SALAH', 'NEGATIVE TEST', 'DENY']
    }),
    ['Unauthorized gateway request', 'GATEWAY_TOKEN']
  );

  results.schoolPalsu = gatewaySecurityNegativeTest_(
    'SCHOOL_PALSU',
    {
      action: 'SPREADSHEET_APPEND',
      schoolId: 'SCHOOL_TIDAK_TERDAFTAR_999999',
      token: cfg.token,
      sheet: 'TRX_GATEWAY_TEST',
      row: [new Date(), 'SECURITY_TEST', 'SCHOOL_PALSU', 'NEGATIVE TEST', 'DENY']
    },
    ['Sekolah tidak ditemukan', 'tidak ACTIVE', 'schoolId']
  );

  results.sheetIlegal = gatewaySecurityNegativeTest_(
    'SHEET_ILEGAL',
    {
      action: 'SPREADSHEET_APPEND',
      schoolId: schoolId,
      token: cfg.token,
      sheet: 'SHEET_TIDAK_DIIZINKAN_999999',
      row: [new Date(), 'SECURITY_TEST', 'SHEET_ILEGAL', 'NEGATIVE TEST', 'DENY']
    },
    ['Sheet tidak diizinkan', 'Belum ada sheet']
  );

  const school2 = clean_(
    PropertiesService.getScriptProperties().getProperty('SECURITY_TEST_SCHOOL_ID_2') || ''
  ).toUpperCase();

  if (!school2) {
    results.crossSchool = {
      status: 'NOT_CONFIGURED',
      message: 'Isi Script Property SECURITY_TEST_SCHOOL_ID_2 untuk menguji isolasi antar-sekolah.'
    };
  } else if (school2 === schoolId) {
    results.crossSchool = {
      status: 'INVALID_CONFIG',
      message: 'SECURITY_TEST_SCHOOL_ID_2 harus berbeda dari sekolah aktif.'
    };
  } else {
    results.crossSchool = gatewaySecurityNegativeTest_(
      'CROSS_SCHOOL',
      {
        action: 'SPREADSHEET_APPEND',
        schoolId: school2,
        token: cfg.token,
        sheet: 'TRX_GATEWAY_TEST',
        row: [new Date(), 'SECURITY_TEST', 'CROSS_SCHOOL', 'NEGATIVE TEST', 'DENY']
      },
      ['Unauthorized gateway request', 'Sekolah tidak ditemukan', 'tidak ACTIVE', 'Sheet tidak diizinkan']
    );
  }

  const allConfigured =
    results.tokenSalah.status === 'PASS' &&
    results.schoolPalsu.status === 'PASS' &&
    results.sheetIlegal.status === 'PASS' &&
    results.crossSchool.status === 'PASS';

  return ok_(results,
    allConfigured
      ? 'SECURITY TEST LULUS: seluruh negative test ditolak Gateway.'
      : 'SECURITY TEST selesai. Periksa hasil tiap pengujian sebelum TAHAP 8.'
  );
}

/**
 * Negative test: HTTP request dianggap PASS jika Gateway menolak request.
 * Tidak menampilkan token dalam error/log.
 */
function gatewaySecurityNegativeTest_(name, payload, expectedFragments) {
  let response;
  try {
    response = UrlFetchApp.fetch(getGatewayConfig_().url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      followRedirects: true
    });
  } catch (e) {
    return {
      status: 'PASS',
      test: name,
      httpStatus: 0,
      message: 'Request gagal dikirim dan tidak mencapai operasi write: ' + (e.message || String(e))
    };
  }

  const httpStatus = response.getResponseCode();
  const raw = response.getContentText() || '';
  let data = null;
  try { data = JSON.parse(raw); } catch (e) {}

  const message = data && data.message ? String(data.message) : raw;
  const normalized = message.toLowerCase();
  const rejectedByHttp = httpStatus < 200 || httpStatus >= 300;
  const rejectedByGateway = data && data.ok === false;
  const matched = expectedFragments.some(function(fragment) {
    return normalized.indexOf(String(fragment).toLowerCase()) >= 0;
  });

  return {
    status: (rejectedByHttp || rejectedByGateway || matched) ? 'PASS' : 'FAIL',
    test: name,
    httpStatus: httpStatus,
    gatewayRejected: !!rejectedByGateway,
    message: gatewayPreview_(message, 500)
  };
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
