/** Helper gateway. */
function gatewayOk_(data) { return ContentService.createTextOutput(JSON.stringify(ok_(data))).setMimeType(ContentService.MimeType.JSON); }
function gatewayFail_(e) { return ContentService.createTextOutput(JSON.stringify(fail_(e.message || String(e)))).setMimeType(ContentService.MimeType.JSON); }
function getSchoolConfig_(schoolId) {
  const id = PropertiesService.getScriptProperties().getProperty('SCHOOL_' + schoolId);
  if (!id) throw new Error('Spreadsheet sekolah belum terdaftar di gateway.');
  return { spreadsheetId:id };
}
