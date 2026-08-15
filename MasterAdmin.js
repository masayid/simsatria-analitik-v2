/**
 * SIM SATRIA — MASTER ADMIN
 *
 * Pengaturan MASTER_* hanya boleh diakses oleh OWNER aplikasi.
 *
 * CATATAN PENTING:
 * MASTER_USER adalah MASTER data user.
 * Sheet USERS pada spreadsheet sekolah dibuat/diisi berdasarkan MASTER_USER.
 * Karena itu halaman MASTER_USER WAJIB membaca MASTER_USER, bukan menggabungkan
 * data USERS sekolah.
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

/**
 * Membaca data MASTER.
 *
 * MASTER_USER secara khusus dibaca LANGSUNG dari sheet MASTER_USER.
 * Kolom npsn dan nama_sekolah ditambahkan sebagai informasi tampilan
 * berdasarkan id_sekolah pada MASTER_SEKOLAH, tetapi sumber user tetap
 * MASTER_USER.
 */
function getMasterSheetData(sheetName) {
  requireMasterOwner_();

  const allowed = Object.keys(MASTER).map(function(key) {
    return MASTER[key];
  });

  if (allowed.indexOf(sheetName) === -1) {
    throw new Error('Sheet MASTER tidak diizinkan: ' + sheetName);
  }

  const ss = getMasterSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet ' + sheetName + ' belum tersedia.');
  }

  /* ================================================================
   * KHUSUS MASTER_USER
   * ================================================================ */
  if (sheetName === MASTER.USER) {
    return getMasterUserSheetData_(ss, sheet);
  }

  const headers = MASTER_HEADERS[sheetName] || [];
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return ok_({
      sheet: sheetName,
      headers: headers,
      rows: []
    }, 'Data MASTER berhasil dimuat.');
  }

  const columnCount = Math.max(headers.length, sheet.getLastColumn());
  const values = sheet.getRange(1, 1, lastRow, columnCount).getValues();
  const rows = values.slice(1)
    .filter(function(row) {
      return row.slice(0, headers.length).some(function(value) {
        return clean_(value) !== '';
      });
    })
    .map(function(row, index) {
      const obj = { _row: index + 2 };
      headers.forEach(function(header, col) {
        if (header) obj[header] = row[col];
      });
      return obj;
    });

  return ok_({
    sheet: sheetName,
    headers: headers,
    rows: rows
  }, 'Data MASTER berhasil dimuat.');
}

/**
 * MASTER_USER = sumber utama akun seluruh sekolah.
 *
 * Tampilan frontend mengikuti kebutuhan OWNER:
 * id_user | id_sekolah | npsn | nama_sekolah | nama | email | role | status
 *
 * npsn/nama_sekolah bukan disimpan ke MASTER_USER; keduanya hanya lookup
 * dari MASTER_SEKOLAH menggunakan id_sekolah.
 */
function getMasterUserSheetData_(masterSs, userSheet) {
  const displayHeaders = [
    'id_user',
    'id_sekolah',
    'npsn',
    'nama_sekolah',
    'nama',
    'email',
    'role',
    'status'
  ];

  const lastRow = userSheet.getLastRow();
  if (lastRow < 2) {
    return ok_({
      sheet: MASTER.USER,
      source: 'MASTER_USER',
      readOnly: true,
      headers: displayHeaders,
      rows: []
    }, 'MASTER_USER belum memiliki data.');
  }

  const masterHeaders = MASTER_HEADERS[MASTER.USER] || [
    'id_user',
    'id_sekolah',
    'nama',
    'email',
    'role',
    'status'
  ];

  const values = userSheet
    .getRange(1, 1, lastRow, Math.max(masterHeaders.length, userSheet.getLastColumn()))
    .getValues();

  /* Lookup sekolah sekali saja agar Refresh tetap ringan. */
  const schoolMap = getMasterSchoolMap_(masterSs);

  const rows = values.slice(1)
    .filter(function(row) {
      return row.slice(0, masterHeaders.length).some(function(value) {
        return clean_(value) !== '';
      });
    })
    .map(function(row, index) {
      const obj = { _row: index + 2 };

      masterHeaders.forEach(function(header, col) {
        obj[header] = row[col];
      });

      const schoolId = clean_(obj.id_sekolah).toUpperCase();
      const school = schoolMap[schoolId] || {};

      obj.npsn = school.npsn || '';
      obj.nama_sekolah = school.nama_sekolah || '';

      return obj;
    });

  return ok_({
    sheet: MASTER.USER,
    source: 'MASTER_USER',
    readOnly: true,
    headers: displayHeaders,
    rows: rows
  }, 'MASTER_USER berhasil dimuat dari Spreadsheet MASTER.');
}

/**
 * Membuat index MASTER_SEKOLAH berdasarkan id_sekolah.
 */
function getMasterSchoolMap_(masterSs) {
  const map = {};
  const sheet = masterSs.getSheetByName(MASTER.SEKOLAH);
  if (!sheet || sheet.getLastRow() < 2) return map;

  const headers = MASTER_HEADERS[MASTER.SEKOLAH] || [
    'id_sekolah',
    'npsn',
    'nama_sekolah',
    'spreadsheet_id',
    'drive_folder_id',
    'status'
  ];

  const values = sheet
    .getRange(1, 1, sheet.getLastRow(), Math.max(headers.length, sheet.getLastColumn()))
    .getValues();

  values.slice(1).forEach(function(row) {
    const id = clean_(row[0]).toUpperCase();
    if (!id) return;

    map[id] = {
      id_sekolah: id,
      npsn: clean_(row[1]),
      nama_sekolah: clean_(row[2]),
      spreadsheet_id: clean_(row[3]),
      drive_folder_id: clean_(row[4]),
      status: clean_(row[5])
    };
  });

  return map;
}

function saveMasterSheetRow(sheetName, rowData) {
  requireMasterOwner_();
  const allowed = Object.keys(MASTER).map(function(key) {
    return MASTER[key];
  });

  if (allowed.indexOf(sheetName) === -1) {
    throw new Error('Sheet MASTER tidak diizinkan: ' + sheetName);
  }

  /* MASTER_USER menjadi sumber data user dan dikelola melalui mekanisme
   * registrasi/sinkronisasi user. Tidak diedit langsung dari tabel MASTER. */
  if (sheetName === MASTER.USER) {
    throw new Error(
      'MASTER_USER bersifat read-only pada tabel ini. ' +
      'Perubahan user dilakukan melalui registrasi/sinkronisasi user sekolah.'
    );
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
  const allowed = Object.keys(MASTER).map(function(key) {
    return MASTER[key];
  });

  if (allowed.indexOf(sheetName) === -1) {
    throw new Error('Sheet MASTER tidak diizinkan: ' + sheetName);
  }

  if (sheetName === MASTER.USER) {
    throw new Error(
      'MASTER_USER bersifat read-only. ' +
      'Kelola user melalui mekanisme registrasi/sinkronisasi user sekolah.'
    );
  }

  const row = Number(rowNumber);
  const ss = getMasterSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' belum tersedia.');
  if (row < 2 || row > sheet.getLastRow()) {
    throw new Error('Baris MASTER tidak valid.');
  }

  sheet.deleteRow(row);
  return getMasterSheetData(sheetName);
}
