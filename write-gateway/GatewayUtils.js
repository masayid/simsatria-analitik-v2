/** Helper gateway mandiri; tidak bergantung pada runtime aplikasi client. */
function gatewayClean_(v) { return v == null ? '' : String(v).trim(); }
function gatewayParse_(text) { try { return JSON.parse(text || '{}'); } catch(e) { throw new Error('Payload gateway bukan JSON valid.'); } }
function gatewayOk_(data) { return ContentService.createTextOutput(JSON.stringify({ok:true,data:data==null?null:data})).setMimeType(ContentService.MimeType.JSON); }
function gatewayFail_(e) { return ContentService.createTextOutput(JSON.stringify({ok:false,code:'GATEWAY_ERROR',message:e.message||String(e)})).setMimeType(ContentService.MimeType.JSON); }
function getSchoolConfig_(schoolId) {
  const id = PropertiesService.getScriptProperties().getProperty('SCHOOL_' + gatewayClean_(schoolId));
  if (!id) throw new Error('Spreadsheet sekolah belum terdaftar di gateway.');
  return {spreadsheetId:id};
}
