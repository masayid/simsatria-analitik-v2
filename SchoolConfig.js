/**
 * SCHOOL_CONFIG
 *
 * Membuat dan menginisialisasi sheet SCHOOL_CONFIG pada spreadsheet sekolah.
 * Sumber identitas sekolah tetap MASTER_SEKOLAH sehingga tidak ada data sekolah
 * yang di-hard-code di aplikasi.
 *
 * Jalankan setup30_initializeSchoolConfig() secara manual sebagai SETUP_OWNER.
 */

const SCHOOL_CONFIG_SHEET = 'SCHOOL_CONFIG';
const SCHOOL_CONFIG_HEADERS = [
  'id_sekolah',
  'npsn',
  'nama_sekolah',
  'spreadsheet_id',
  'drive_folder_id',
  'status',
  'initialized_at',
  'initialized_by',
  'app_version'
];

function setup30_initializeSchoolConfig() {
  requireSetupAccess_();

  const master = getMasterSpreadsheet_();
  const rows = readSheetObjects_(master, MASTER.SEKOLAH);
  const spreadsheetId = getSchoolSpreadsheetId_();

  if (!spreadsheetId) {
    throw new Error(
      'Spreadsheet sekolah belum dapat ditentukan. ' +
      'Pastikan id_sekolah tersimpan pada Script Properties atau MASTER_SEKOLAH.'
    );
  }

  const target = rows.find(function(row) {
    return clean_(row.spreadsheet_id) === spreadsheetId;
  });

  if (!target) {
    throw new Error(
      'Spreadsheet sekolah tidak ditemukan di MASTER_SEKOLAH: ' + spreadsheetId
    );
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const result = ensureSchoolConfigSheet_(spreadsheet, target);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function setup30_initializeAllSchoolConfigs() {
  requireSetupAccess_();

  const master = getMasterSpreadsheet_();
  const rows = readSheetObjects_(master, MASTER.SEKOLAH);
  const results = [];

  rows
    .filter(function(row) {
      return clean_(row.status).toUpperCase() === APP_CONFIG.STATUS.ACTIVE;
    })
    .forEach(function(row) {
      const spreadsheetId = clean_(row.spreadsheet_id);
      if (!spreadsheetId) return;

      try {
        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        results.push(ensureSchoolConfigSheet_(spreadsheet, row));
      } catch (error) {
        results.push({
          ok: false,
          id_sekolah: clean_(row.id_sekolah).toUpperCase(),
          spreadsheet_id: spreadsheetId,
          message: error && error.message ? error.message : String(error)
        });
      }
    });

  Logger.log(JSON.stringify(results, null, 2));
  return results;
}

function getSchoolConfig_() {
  const spreadsheetId = getSchoolSpreadsheetId_();
  if (!spreadsheetId) {
    throw new Error('Spreadsheet sekolah belum teridentifikasi.');
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(SCHOOL_CONFIG_SHEET);

  if (!sheet) {
    throw new Error(
      'Sheet SCHOOL_CONFIG belum tersedia pada spreadsheet sekolah ' +
      spreadsheetId + '. Jalankan setup30_initializeSchoolConfig() sebagai SETUP_OWNER.'
    );
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0].map(function(value) {
    return clean_(value);
  });
  const row = values[1];
  const result = {};

  headers.forEach(function(header, index) {
    if (header) result[header] = row[index];
  });

  return result;
}

function ensureSchoolConfigSheet_(spreadsheet, schoolRow) {
  let sheet = spreadsheet.getSheetByName(SCHOOL_CONFIG_SHEET);
  const now = new Date();
  const email = Session.getActiveUser().getEmail() || 'SETUP_OWNER';

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SCHOOL_CONFIG_SHEET);
  }

  const existingHeaders = sheet.getLastColumn() > 0
    ? sheet.getRange(
        1,
        1,
        1,
        Math.max(sheet.getLastColumn(), SCHOOL_CONFIG_HEADERS.length)
      ).getValues()[0]
    : [];

  const headerMatches = SCHOOL_CONFIG_HEADERS.every(function(header, index) {
    return clean_(existingHeaders[index]).toLowerCase() === header.toLowerCase();
  });

  if (!headerMatches) {
    sheet.clear();
    sheet.getRange(1, 1, 1, SCHOOL_CONFIG_HEADERS.length)
      .setValues([SCHOOL_CONFIG_HEADERS]);
  }

  const rowValues = [[
    clean_(schoolRow.id_sekolah).toUpperCase(),
    clean_(schoolRow.npsn),
    clean_(schoolRow.nama_sekolah),
    clean_(schoolRow.spreadsheet_id),
    clean_(schoolRow.drive_folder_id),
    clean_(schoolRow.status).toUpperCase() || APP_CONFIG.STATUS.ACTIVE,
    now,
    email,
    APP_CONFIG.VERSION
  ]];

  if (sheet.getMaxRows() < 2) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 2 - sheet.getMaxRows());
  }

  sheet.getRange(2, 1, 1, SCHOOL_CONFIG_HEADERS.length).setValues(rowValues);
  sheet.getRange(1, 1, 1, SCHOOL_CONFIG_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, SCHOOL_CONFIG_HEADERS.length);

  return {
    ok: true,
    id_sekolah: rowValues[0][0],
    npsn: rowValues[0][1],
    nama_sekolah: rowValues[0][2],
    spreadsheet_id: rowValues[0][3],
    sheet: SCHOOL_CONFIG_SHEET,
    message: 'SCHOOL_CONFIG berhasil dibuat/diinisialisasi.'
  };
}

function getSchoolSpreadsheetId_() {
  const props = PropertiesService.getScriptProperties();
  const schoolId = clean_(props.getProperty(APP_CONFIG.PROP.SCHOOL_ID));

  // Untuk project aplikasi sekolah yang sudah menyimpan ID spreadsheet lokal.
  const localSpreadsheetId = clean_(props.getProperty('SAT_spreadsheetId'));
  if (localSpreadsheetId) return localSpreadsheetId;

  // Prioritas utama: bila ada SAT_schoolId, selalu resolve ke MASTER_SEKOLAH.
  // Ini mencegah SpreadsheetApp.getActiveSpreadsheet() salah menunjuk ke MASTER.
  if (schoolId) {
    const master = getMasterSpreadsheet_();
    const rows = readSheetObjects_(master, MASTER.SEKOLAH);
    const target = rows.find(function(row) {
      return clean_(row.id_sekolah).toUpperCase() === schoolId.toUpperCase();
    });

    if (target && clean_(target.spreadsheet_id)) {
      return clean_(target.spreadsheet_id);
    }
  }

  // Fallback terakhir untuk project yang benar-benar container-bound ke sekolah.
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active.getId();
  } catch (e) {}

  return '';
}
