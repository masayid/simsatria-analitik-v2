/** Semua operasi write/upload/PDF diarahkan ke gateway terotorisasi. */
function gatewayCall_(action, payload) {
  const cfg = getGatewayConfig_();
  if (!cfg.url || !cfg.token) throw new Error('Write Gateway belum dikonfigurasi.');
  const body = Object.assign({ action: action, schoolId: getCurrentSchool_().id_sekolah, token: cfg.token }, payload || {});
  const res = UrlFetchApp.fetch(cfg.url, { method:'post', contentType:'application/json', payload:JSON.stringify(body), muteHttpExceptions:true });
  const data = safeJsonParse_(res.getContentText());
  if (!data.ok) throw new Error(data.message || 'Gateway menolak operasi.');
  return data;
}

function saveDataViaGateway(menu, sheet, row) { requirePermission_(APP_CONFIG.PERMISSION.INPUT, menu); return gatewayCall_('SPREADSHEET_APPEND', { sheet:sheet, row:row }); }
function uploadViaGateway(menu, file) { requirePermission_(APP_CONFIG.PERMISSION.UPLOAD, menu); return gatewayCall_('DRIVE_UPLOAD', file); }
function pdfViaGateway(menu, payload) { requirePermission_(APP_CONFIG.PERMISSION.PDF, menu); return gatewayCall_('PDF_CREATE', payload); }
