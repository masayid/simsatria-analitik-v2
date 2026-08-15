/**
 * SIM SATRIA — MASTER ADMIN
 *
 * Pengaturan MASTER_* hanya boleh diakses oleh OWNER aplikasi.
 * MASTER_USER ditampilkan dari sheet USERS pada spreadsheet sekolah masing-masing.
 */

function requireMasterOwner_() {
  const activeEmail = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!isAppOwner_(activeEmail)) {
    throw new Error('Pengaturan MASTER hanya dapat diakses oleh OWNER aplikasi.');
  }
  return activeEmail;
}

function getMasterAdminContext() {
  const email = requireMasterOwner_();
  return ok_({
    isOwner: true,
    email: email,
    sheets: Object.keys(MASTER).map(function(key) {
      return {
        key: key,
        name: MASTER[key],
        headers: MASTER_HEADERS[MASTER[key]] || []
      };
    })
  }, 'Akses MASTER valid.');
}

function getMasterSheetData(sheetName) {
  requireMasterOwner_();
  const allowed = Object.keys(MASTER).map(function(key) { return MASTER[key]; });
  if (allowed.indexOf(sheetName) === -1) {
    throw new Error('Sheet MASTER tidak diizinkan: ' + sheetName);
  }

  // MASTER_USER bukan tabel sumber akun. Tampilkan gabungan USERS sekolah.
  if (sheetName === MASTER.USER) {
    return ok_({
      sheet: sheetName,
      source: SCHOOL_USERS_SHEET,
      readOnly: true,
      headers: ['id_user','id_sekolah','npsn','nama_sekolah','nama','email','role','status'],
      rows: getAllSchoolUsers_()
    }, 'Data user sekolah berhasil dimuat dari USERS.');
  }

  const ss = getMasterSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' belum tersedia.');

  const headers = MASTER_HEADERS[sheetName] || [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return ok_({sheet: sheetName, headers: headers, rows: []}, 'Data MASTER berhasil dimuat.');
  }

  const columnCount = Math.max(headers.length, sheet.getLastColumn());
  const values = sheet.getRange(1, 1, lastRow, columnCount).getValues();
  const actualHeaders = headers.slice();
  const rows = values.slice(1)
    .filter(function(row) {
      return row.slice(0, headers.length).some(function(value) { return clean_(value) !== ''; });
    })
    .map(function(row, index) {
      const obj = { _row: index + 2 };
      actualHeaders.forEach(function(header, col) {
        if (header) obj[header] = row[col];
      });
      return obj;
    });

  return ok_({sheet: sheetName, headers: actualHeaders, rows: rows}, 'Data MASTER berhasil dimuat.');
}

function saveMasterSheetRow(sheetName, rowData) {
  requireMasterOwner_();
  const allowed = Object.keys(MASTER).map(function(key) { return MASTER[key]; });
  if (allowed.indexOf(sheetName) === -1) {
    throw new Error('Sheet MASTER tidak diizinkan: ' + sheetName);
  }

  // USERS dikelola di spreadsheet sekolah, bukan dari MASTER.
  if (sheetName === MASTER.USER) {
    throw new Error('MASTER_USER bersifat read-only. Kelola Guru/Karyawan/Siswa pada sheet USERS sekolah masing-masing.');
  }

  const ss = getMasterSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' belum tersedia.');

  const headers = MASTER_HEADERS[sheetName] || [];
  const data = rowData || {};
  const values = headers.map(function(header) {
    return data[header] == null ? '' : data[header];
  });
  const rowNumber = Number(data._row || 0);

  if (rowNumber >= 2 && rowNumber <= sheet.getMaxRows()) {
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([values]);
  }

  return getMasterSheetData(sheetName);
}

function deleteMasterSheetRow(sheetName, rowNumber) {
  requireMasterOwner_();
  const allowed = Object.keys(MASTER).map(function(key) { return MASTER[key]; });
  if (allowed.indexOf(sheetName) === -1) {
    throw new Error('Sheet MASTER tidak diizinkan: ' + sheetName);
  }

  if (sheetName === MASTER.USER) {
    throw new Error('MASTER_USER bersifat read-only. Kelola user pada sheet USERS sekolah masing-masing.');
  }

  const row = Number(rowNumber);
  const ss = getMasterSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' belum tersedia.');
  if (row < 2 || row > sheet.getLastRow()) throw new Error('Baris MASTER tidak valid.');

  sheet.deleteRow(row);
  return getMasterSheetData(sheetName);
}
