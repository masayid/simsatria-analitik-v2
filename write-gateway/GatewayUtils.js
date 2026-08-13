/** WRITE GATEWAY — utilitas internal. */
function gatewayClean_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function gatewayParse_(text) {
  try { return JSON.parse(text || '{}'); }
  catch (e) { throw new Error('Payload gateway bukan JSON valid.'); }
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
 * Sumber konfigurasi sekolah gateway = MASTER_SEKOLAH.
 * Gateway berjalan sebagai deployer/owner sehingga dapat membaca MASTER.
 */
function getSchoolConfig_(schoolId) {
  const school = findSchoolById_(schoolId);
  gatewayRequire_(school, 'Sekolah tidak ditemukan atau tidak ACTIVE.');
  gatewayRequire_(school.spreadsheet_id, 'Spreadsheet sekolah belum dikonfigurasi.');
  gatewayRequire_(school.drive_folder_id, 'Folder Drive sekolah belum dikonfigurasi.');
  return {
    idSekolah: gatewayClean_(school.id_sekolah).toUpperCase(),
    spreadsheetId: gatewayClean_(school.spreadsheet_id),
    driveFolderId: gatewayClean_(school.drive_folder_id),
    namaSekolah: gatewayClean_(school.nama_sekolah)
  };
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
  gatewayRequire_(bytes.length <= 10 * 1024 * 1024, 'Ukuran file gateway maksimal 10 MB.');
  return Utilities.newBlob(bytes, mimeType || 'application/octet-stream', gatewaySafeFileName_(fileName));
}
