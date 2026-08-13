/** Operasi write spreadsheet dilakukan oleh gateway. */
function gatewayAppend_(schoolId, sheetName, row) {
  const ss = SpreadsheetApp.openById(getSchoolConfig_(schoolId).spreadsheetId);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet tujuan tidak ditemukan: ' + sheetName);
  sh.appendRow(Array.isArray(row) ? row : Object.values(row));
  return { sheet: sheetName, row: sh.getLastRow() };
}
