/** Operasi append spreadsheet dilakukan oleh Write Gateway. */
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
