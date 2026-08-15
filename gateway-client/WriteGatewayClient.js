/**
 * Semua operasi write/upload/PDF/read sekolah diarahkan ke Gateway terotorisasi.
 * Token tidak pernah ditampilkan ke frontend.
 */
function gatewayCall_(action, payload) {
  const cfg = getGatewayConfig_();

  if (!cfg.url || !cfg.token) {
    throw new Error('Write Gateway belum dikonfigurasi.');
  }

  const school = getGatewayCurrentSchool_();
  const schoolId = school && (school.idSekolah || school.id_sekolah)
    ? (school.idSekolah || school.id_sekolah)
    : '';

  if (!schoolId) {
    throw new Error('ID sekolah pengguna tidak ditemukan.');
  }

  const body = Object.assign({}, payload || {}, {
    action: action,
    schoolId: schoolId,
    token: cfg.token
  });

  return gatewayFetchJson_(cfg, body, 'Write Gateway');
}

/**
 * Lookup identitas user melalui Gateway.
 * Gateway menentukan sekolah dari MASTER_SEKOLAH lalu membaca USERS sekolah.
 */
function gatewayLookupCurrentUser_() {
  const cfg = getGatewayConfig_();
  if (!cfg.url || !cfg.token) {
    throw new Error('Write Gateway belum dikonfigurasi.');
  }

  const email = Session.getActiveUser().getEmail();
  if (!email) {
    throw new Error('Akun Google tidak teridentifikasi.');
  }

  const data = gatewayFetchJson_(cfg, {
    action: 'AUTH_LOOKUP_USER',
    email: email,
    token: cfg.token
  }, 'Gateway Auth');

  return data && data.data ? data.data : null;
}

function gatewayFetchJson_(cfg, body, label) {
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
      'Gagal menghubungi ' + label + '. ' +
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
      'Respons ' + label + ' bukan JSON valid. HTTP ' + httpStatus +
      (contentType ? ' | Content-Type: ' + contentType : '') +
      ' | Respons: ' + gatewayPreview_(rawText, 1000)
    );
  }

  if (!data || data.ok !== true) {
    throw new Error(
      label + ' error. HTTP ' + httpStatus +
      ' | ' + (data && data.message ? data.message : 'Gateway menolak operasi.')
    );
  }

  return data;
}

function getGatewayCurrentSchool_() {
  try {
    const session = getSessionContext();
    const data = session && session.ok && session.data ? session.data : session;
    if (data && data.school) return data.school;
  } catch (e) {
    // Fallback hanya untuk konteks setup/legacy.
  }

  return getCurrentSchool_();
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

/** Read-only helper yang saat ini dipakai Agenda Guru untuk sheet KELAS. */
function readSheetViaGateway(sheet) {
  return gatewayCall_('SPREADSHEET_READ', { sheet: sheet });
}
