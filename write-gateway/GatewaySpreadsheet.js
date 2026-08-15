/** Operasi spreadsheet melalui Gateway. */
function gatewayAppend_(schoolId, sheetName, row) {
  const name = gatewayClean_(sheetName);
  gatewayRequire_(name, 'Sheet tujuan wajib dikirim.');
  const values = gatewayNormalizeRow_(row);
  const ss = gatewayGetSpreadsheet_(schoolId);
  const sh = ss.getSheetByName(name);
  gatewayRequire_(sh, 'Sheet tujuan tidak ditemukan: ' + name);
  sh.appendRow(values);
  return {
    schoolId: gatewayClean_(schoolId).toUpperCase(),
    sheet: name,
    row: sh.getLastRow()
  };
}

/** Read-only: saat ini sengaja dibatasi GatewayPermission_ hanya untuk KELAS. */
function gatewayReadSheet_(schoolId, sheetName) {
  const name = gatewayClean_(sheetName);
  const ss = gatewayGetSpreadsheet_(schoolId);
  const sh = ss.getSheetByName(name);

  if (!sh) {
    return {
      schoolId: gatewayClean_(schoolId).toUpperCase(),
      sheet: name,
      exists: false,
      values: []
    };
  }

  const lastRow = sh.getLastRow();
  const lastColumn = sh.getLastColumn();
  const values = (lastRow > 0 && lastColumn > 0)
    ? sh.getRange(1, 1, lastRow, lastColumn).getDisplayValues()
    : [];

  return {
    schoolId: gatewayClean_(schoolId).toUpperCase(),
    sheet: name,
    exists: true,
    values: values
  };
}
