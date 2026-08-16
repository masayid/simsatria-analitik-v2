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

/**
 * Panggil Web App Gateway sebagai endpoint server-to-server.
 *
 * GATEWAY_TOKEN tetap menjadi autentikasi aplikasi utama.
 * OAuth Bearer dikirim sebagai lapisan kompatibilitas tambahan agar request
 * UrlFetchApp juga dapat melewati deployment Gateway yang disetel
 * "Anyone with Google account". Jika Gateway disetel "Anyone", Bearer ini
 * tidak mengubah otorisasi aplikasi karena Gateway tetap memeriksa token.
 *
 * Token aplikasi tetap berada di body request dan tidak pernah dikirim ke
 * frontend.
 */
function gatewayFetchJson_(cfg, body, label) {
  let res;
  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
      followRedirects: true
    };

    // Apps Script Web App dengan akses "Anyone with Google account"
    // membutuhkan autentikasi Google pada request server-to-server.
    // GATEWAY_TOKEN tetap divalidasi oleh Gateway sebagai credential aplikasi.
    try {
      const oauthToken = ScriptApp.getOAuthToken();
      if (oauthToken) {
        options.headers = {
          Authorization: 'Bearer ' + oauthToken
        };
      }
    } catch (authError) {
      // Jika OAuth token tidak tersedia, Gateway yang publik tetap dapat
      // dipanggil menggunakan GATEWAY_TOKEN pada body.
    }

    res = UrlFetchApp.fetch(cfg.url, options);
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

/**
 * Membuat PDF untuk akun Google user yang sedang login.
 * Email TIDAK diambil dari frontend; server mengambilnya dari Session aktif.
 * Gateway kemudian memberikan hak VIEW hanya kepada akun tersebut.
 */
function pdfViaGateway(menu, payload) {
  requirePermission_(APP_CONFIG.PERMISSION.PDF, menu);

  const email = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!email) {
    throw new Error('Akun Google pengguna tidak teridentifikasi. PDF tidak dapat dikirim ke akun user.');
  }

  const pdfPayload = Object.assign({}, payload || {}, {
    recipientEmail: email
  });

  return gatewayCall_('PDF_CREATE', pdfPayload);
}

/** Read-only helper yang saat ini dipakai Agenda Guru untuk sheet KELAS. */
function readSheetViaGateway(sheet) {
  return gatewayCall_('SPREADSHEET_READ', { sheet: sheet });
}
