/**
 * Setup sederhana allowlist Agenda Mengajar untuk Sekolah 2.
 * Jalankan sekali di PROJECT WRITE GATEWAY sebagai owner/admin.
 *
 * Struktur TRX_AGENDA_GURU:
 * 13 kolom, termasuk bukti_fisik.
 */
function setupGatewaySchool2AgendaAllowlist() {
  const schoolId = 'SMANTI03PWJ';
  const targetSheet = 'TRX_AGENDA_GURU';

  const school = getSchoolConfig_(schoolId);

  gatewayRequire_(
    school && school.idSekolah === schoolId,
    'Konfigurasi sekolah tidak valid: ' + schoolId
  );

  // ==========================================
  // 1. SIMPAN ALLOWLIST GATEWAY
  // ==========================================
  const props = PropertiesService.getScriptProperties();

  const current = (props
    .getProperty('GATEWAY_SHEETS_' + schoolId) || '')
    .split(',')
    .map(gatewayClean_)
    .filter(Boolean);

  if (current.indexOf(targetSheet) < 0) {
    current.push(targetSheet);
  }

  props.setProperty(
    'GATEWAY_SHEETS_' + schoolId,
    current.join(',')
  );

  // ==========================================
  // 2. SIMPAN DRIVE FOLDER SEKOLAH
  // ==========================================
  props.setProperty(
    'DRIVE_' + schoolId,
    school.driveFolderId
  );

  // ==========================================
  // 3. BUKA SPREADSHEET SEKOLAH
  // ==========================================
  const ss = SpreadsheetApp.openById(
    school.spreadsheetId
  );

  // ==========================================
  // 4. CARI SHEET TRX_AGENDA_GURU
  // ==========================================
  let sheet = ss.getSheetByName(targetSheet);

  // ==========================================
  // 5. JIKA BELUM ADA, BUAT SHEET BARU
  // ==========================================
  if (!sheet) {

    sheet = ss.insertSheet(targetSheet);

    sheet.getRange(1, 1, 1, 13).setValues([[
      'timestamp',
      'id_user',
      'nama',
      'tanggal',
      'sesi',
      'kelas',
      'tujuan_pembelajaran',
      'materi_pembelajaran',
      'dpl',
      'pengalaman_belajar',
      'prinsip_pembelajaran',
      'rekap_siswa_tidak_masuk',
      'bukti_fisik'
    ]]);

    sheet.setFrozenRows(1);
  }

  // ==========================================
  // 6. JIKA SHEET SUDAH ADA
  //    TIDAK MENGUBAH KOLOM LAMA
  // ==========================================

  const result = {
    ok: true,
    schoolId: schoolId,
    targetSheet: targetSheet,
    allowedSheets: current,
    sheetExists: !!sheet,
    columnCount: 13,
    columns: [
      'timestamp',
      'id_user',
      'nama',
      'tanggal',
      'sesi',
      'kelas',
      'tujuan_pembelajaran',
      'materi_pembelajaran',
      'dpl',
      'pengalaman_belajar',
      'prinsip_pembelajaran',
      'rekap_siswa_tidak_masuk',
      'bukti_fisik'
    ],
    message:
      'TRX_AGENDA_GURU siap digunakan melalui Write Gateway dengan kolom bukti_fisik.'
  };

  Logger.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}
