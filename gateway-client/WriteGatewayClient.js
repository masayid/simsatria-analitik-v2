/**
 * Semua operasi write/upload/PDF diarahkan ke gateway terotorisasi.
 * Mode diagnostik menampilkan HTTP status, Content-Type, dan respons mentah
 * jika Gateway tidak mengembalikan JSON. Token tidak pernah ditampilkan.
 */
function gatewayCall_(action, payload) {
  const cfg = getGatewayConfig_();

  if (!cfg.url || !cfg.token) {
    throw new Error('Write Gateway belum dikonfigurasi.');
  }

  const school = getCurrentSchool_();
  const schoolId = school && school.id_sekolah ? school.id_sekolah : '';

  if (!schoolId) {
    throw new Error('ID sekolah pengguna tidak ditemukan.');
  }

  const body = Object.assign({
    action: action,
    schoolId: schoolId,
    token: cfg.token
  }, payload || {});

  let res;

  try {
    res = UrlFetchApp.fetch(cfg.url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
      followRedirects: true
    });
  } catch (e) {
    throw new Error(
      'Gagal menghubungi Write Gateway. ' +
      'Periksa URL deployment Gateway dan akses Web App. Detail: ' +
      (e && e.message ? e.message : String(e))
    );
  }

  const httpStatus = res.getResponseCode();
  const rawText = res.getContentText();
  const headers = res.getHeaders ? res.getHeaders() : {};
  const contentType = headers['Content-Type'] || headers['content-type'] || '';

  let data;

  try {
    data = JSON.parse(rawText || '');
  } catch (e) {
    throw new Error(
      'Respons Write Gateway bukan JSON valid. HTTP ' + httpStatus +
      (contentType ? ' | Content-Type: ' + contentType : '') +
      ' | Respons: ' + gatewayPreview_(rawText, 1000)
    );
  }

  if (!data || data.ok !== true) {
    throw new Error(
      'Write Gateway error. HTTP ' + httpStatus +
      ' | ' + (data && data.message ? data.message : 'Gateway menolak operasi.')
    );
  }

  return data;
}

function gatewayPreview_(value, maxLength) {
  const text = value == null ? '' : String(value);
  const limit = maxLength || 1000;
  return text.length <= limit ? text : text.substring(0, limit) + ' ...[dipotong]';
}

function saveDataViaGateway(menu, sheet, row) {
  requirePermission_(APP_CONFIG.PERMISSION.INPUT, menu);
  return gatewayCall_('SPREADSHEET_APPEND', { sheet: sheet, row: row });
}

function uploadViaGateway(menu, file) {
  requirePermission_(APP_CONFIG.PERMISSION.UPLOAD, menu);
  return gatewayCall_('DRIVE_UPLOAD', file);
}

function pdfViaGateway(menu, payload) {
  requirePermission_(APP_CONFIG.PERMISSION.PDF, menu);
  return gatewayCall_('PDF_CREATE', payload);
}
