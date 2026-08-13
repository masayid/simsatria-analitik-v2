/** WRITE GATEWAY — utilitas internal. */
function gatewayClean_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function gatewayParse_(text) {
  try {
    return JSON.parse(text || '{}');
  } catch (e) {
    throw new Error('Payload gateway bukan JSON valid.');
  }
}

function gatewayOk_(data, message) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    data: data == null ? null : data,
    message: message || ''
  })).setMimeType(ContentService.MimeType.JSON);
}

function gatewayFail_(e) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    code: 'GATEWAY_ERROR',
    message: e && e.message ? e.message : String(e)
  })).setMimeType(ContentService.MimeType.JSON);
}

function gatewayRequire_(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Membaca konfigurasi sekolah langsung dari MASTER_SEKOLAH.
 * Gateway adalah project terpisah dan tidak boleh bergantung pada fungsi
 * findSchoolById_() milik project SIM SATRIA client.
 */
function getSchoolConfig_(schoolId) {
  const masterId = PropertiesService.getScriptProperties().getProperty(
    GATEWAY_CONFIG.PROP.MASTER_SPREADSHEET_ID
  );

  gatewayRequire_(
    masterId,
    'MASTER_SPREADSHEET_ID belum dikonfigurasi pada Write Gateway.'
  );

  const ss = SpreadsheetApp.openById(masterId);
  const sheet = ss.getSheetByName('MASTER_SEKOLAH');

  gatewayRequire_(sheet, 'Sheet MASTER_SEKOLAH tidak ditemukan.');

  const values = sheet.getDataRange().getValues();
  gatewayRequire_(values.length >= 2, 'MASTER_SEKOLAH belum memiliki data sekolah.');

  const headers = values[0].map(function(h) {
    return gatewayClean_(h).toLowerCase();
  });

  const idx = {
    id_sekolah: headers.indexOf('id_sekolah'),
    npsn: headers.indexOf('npsn'),
    nama_sekolah: headers.indexOf('nama_sekolah'),
    spreadsheet_id: headers.indexOf('spreadsheet_id'),
    drive_folder_id: headers.indexOf('drive_folder_id'),
    status: headers.indexOf('status')
  };

  gatewayRequire_(idx.id_sekolah >= 0, 'Kolom id_sekolah tidak ditemukan.');
  gatewayRequire_(idx.spreadsheet_id >= 0, 'Kolom spreadsheet_id tidak ditemukan.');
  gatewayRequire_(idx.drive_folder_id >= 0, 'Kolom drive_folder_id tidak ditemukan.');

  const target = gatewayClean_(schoolId).toUpperCase();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = gatewayClean_(row[idx.id_sekolah]).toUpperCase();

    if (id !== target) continue;

    const status = idx.status >= 0
      ? gatewayClean_(row[idx.status]).toUpperCase()
      : 'ACTIVE';

    gatewayRequire_(status === 'ACTIVE', 'Sekolah tidak ditemukan atau tidak ACTIVE.');

    const spreadsheetId = gatewayClean_(row[idx.spreadsheet_id]);
    const driveFolderId = gatewayClean_(row[idx.drive_folder_id]);

    gatewayRequire_(spreadsheetId, 'Spreadsheet sekolah belum dikonfigurasi.');
    gatewayRequire_(driveFolderId, 'Folder Drive sekolah belum dikonfigurasi.');

    return {
      idSekolah: id,
      spreadsheetId: spreadsheetId,
      driveFolderId: driveFolderId,
      namaSekolah: idx.nama_sekolah >= 0
        ? gatewayClean_(row[idx.nama_sekolah])
        : ''
    };
  }

  throw new Error('Sekolah ' + target + ' tidak ditemukan di MASTER_SEKOLAH.');
}

function gatewayGetSpreadsheet_(schoolId) {
  return SpreadsheetApp.openById(getSchoolConfig_(schoolId).spreadsheetId);
}

function gatewayGetFolder_(schoolId) {
  return DriveApp.getFolderById(getSchoolConfig_(schoolId).driveFolderId);
}

function gatewayNormalizeRow_(row) {
  gatewayRequire_(Array.isArray(row), 'row harus berupa array.');
  gatewayRequire_(row.length > 0, 'row tidak boleh kosong.');
  gatewayRequire_(row.length <= 100, 'row terlalu panjang.');
  return row;
}

function gatewaySafeFileName_(name) {
  const value = gatewayClean_(name || 'upload.bin').replace(/[\\/:*?"<>|]/g, '_');
  return value.substring(0, 180) || 'upload.bin';
}

function gatewayBase64ToBlob_(base64, mimeType, fileName) {
  gatewayRequire_(base64, 'Konten file/base64 belum dikirim.');
  const bytes = Utilities.base64Decode(String(base64));
  gatewayRequire_(bytes.length > 0, 'File kosong.');
  gatewayRequire_(bytes.length <= GATEWAY_CONFIG.MAX_UPLOAD_BYTES, 'Ukuran file gateway maksimal 10 MB.');
  return Utilities.newBlob(bytes, mimeType || 'application/octet-stream', gatewaySafeFileName_(fileName));
}
