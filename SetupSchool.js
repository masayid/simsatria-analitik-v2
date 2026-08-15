/** SIM SATRIA Multi Sekolah - TAHAP 8 runner. */
function setup21_initializeSchoolDatabase() {
  const schoolId = 'SMANTI03PWJ';
  const result = initializeSchoolDatabase_(schoolId);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function setup22_checkSchoolDatabase() {
  const schoolId = 'SMANTI03PWJ';
  const result = getSchoolDatabaseStatus_(schoolId);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Membuat SCHOOL_CONFIG khusus sekolah kedua.
 * Tidak bergantung pada SAT_schoolId Script Property karena fungsi ini
 * memang dijalankan manual oleh SETUP_OWNER untuk provisioning sekolah.
 */
function setup30_initializeSchool2SchoolConfig() {
  requireSetupAccess_();

  const schoolId = 'SMANDA2SKJ';
  const school = findSchoolById_(schoolId);

  if (!school) {
    throw new Error(
      'Sekolah tidak ditemukan atau tidak ACTIVE di MASTER_SEKOLAH: ' + schoolId
    );
  }

  const spreadsheetId = clean_(school.spreadsheet_id);
  if (!spreadsheetId) {
    throw new Error(
      'spreadsheet_id untuk sekolah ' + schoolId + ' belum terisi di MASTER_SEKOLAH.'
    );
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const result = ensureSchoolConfigSheet_(spreadsheet, school);

  result.schoolId = schoolId;
  result.spreadsheetId = spreadsheetId;
  result.message =
    'SCHOOL_CONFIG sekolah 2 berhasil dibuat/diinisialisasi. ' +
    'Spreadsheet: ' + spreadsheet.getName();

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
