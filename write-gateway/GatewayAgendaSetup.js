/**
 * Setup sederhana allowlist Agenda Mengajar untuk Sekolah 2.
 * Jalankan sekali di PROJECT WRITE GATEWAY sebagai owner/admin.
 */
function setupGatewaySchool2AgendaAllowlist() {
  const schoolId = 'SMANTI03PWJ';
  const targetSheet = 'TRX_AGENDA_GURU';
  const school = getSchoolConfig_(schoolId);
  gatewayRequire_(school && school.idSekolah === schoolId, 'Konfigurasi sekolah tidak valid: ' + schoolId);

  const props = PropertiesService.getScriptProperties();
  const current = (props.getProperty('GATEWAY_SHEETS_' + schoolId) || '')
    .split(',').map(gatewayClean_).filter(Boolean);
  if (current.indexOf(targetSheet) < 0) current.push(targetSheet);
  props.setProperty('GATEWAY_SHEETS_' + schoolId, current.join(','));
  props.setProperty('DRIVE_' + schoolId, school.driveFolderId);

  const ss = SpreadsheetApp.openById(school.spreadsheetId);
  let sheet = ss.getSheetByName(targetSheet);
  if (!sheet) {
    sheet = ss.insertSheet(targetSheet);
    sheet.getRange(1, 1, 1, 12).setValues([[
      'timestamp','id_user','nama','tanggal','sesi','kelas',
      'tujuan_pembelajaran','materi_pembelajaran','dpl',
      'pengalaman_belajar','prinsip_pembelajaran','rekap_siswa_tidak_masuk'
    ]]);
    sheet.setFrozenRows(1);
  }

  const result = {
    ok: true,
    schoolId: schoolId,
    targetSheet: targetSheet,
    allowedSheets: current,
    sheetExists: !!sheet,
    message: 'TRX_AGENDA_GURU siap digunakan melalui Write Gateway.'
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
