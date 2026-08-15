/**
 * SIM SATRIA — MASTER ADMIN
 *
 * Pengaturan MASTER_* hanya boleh diakses oleh SETUP_OWNER.
 * Proteksi dilakukan di server, bukan hanya disembunyikan dari frontend.
 */

function requireMasterOwner_() {
  const activeEmail = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const ownerEmail = clean_(PropertiesService.getScriptProperties()
    .getProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL)).toLowerCase();

  if (!ownerEmail) {
    throw new Error('SETUP_OWNER_EMAIL belum dikonfigurasi.');
  }

  if (!activeEmail || activeEmail !== ownerEmail) {
    throw new Error('Pengaturan MASTER hanya dapat diakses oleh OWNER aplikasi.');
  }

  return ownerEmail;
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

  const ss = getMasterSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' belum tersedia.');

  const headers = MASTER_HEADERS[sheetName] || [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { sheet: sheetName, headers: headers, rows: [] };

  const values = sheet.getRange(1, 1, lastRow, headers.length).getValues();
  const actualHeaders = values[0].map(clean_);
  const rows = values.slice(1).filter(function(row) {
    return row.some(function(value) { return clean_(value) !== ''; });
  }).map(function(row, index) {
    const obj = { _row: index + 2 };
    actualHeaders.forEach(function(header, col) {
      if (header) obj[header] = row[col];
    });
    return obj;
  });

  return { sheet: sheetName, headers: actualHeaders, rows: rows };
}

function saveMasterSheetRow(sheetName, rowData) {
  requireMasterOwner_();
  const allowed = Object.keys(MASTER).map(function(key) { return MASTER[key]; });
  if (allowed.indexOf(sheetName) === -1) {
    throw new Error('Sheet MASTER tidak diizinkan: ' + sheetName);
  }

  const ss = getMasterSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' belum tersedia.');

  const headers = MASTER_HEADERS[sheetName] || [];
  const data = rowData || {};
  const values = headers.map(function(header) { return data[header] == null ? '' : data[header]; });
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

  const row = Number(rowNumber);
  const ss = getMasterSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' belum tersedia.');
  if (row < 2 || row > sheet.getLastRow()) throw new Error('Baris MASTER tidak valid.');

  sheet.deleteRow(row);
  return getMasterSheetData(sheetName);
}
