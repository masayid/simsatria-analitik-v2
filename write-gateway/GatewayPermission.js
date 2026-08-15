/** Allowlist operasi Write Gateway. */
function gatewayRequireAction_(action, payload) {
  const allowed = ['AUTH_LOOKUP_USER', 'SPREADSHEET_APPEND', 'DRIVE_UPLOAD', 'PDF_CREATE'];
  if (allowed.indexOf(action) < 0) throw new Error('Action gateway tidak diizinkan.');

  // Lookup user adalah operasi read-only yang sengaja tidak menerima
  // schoolId dari client. Gateway menentukan sekolah dari sumber MASTER/USERS.
  if (action === 'AUTH_LOOKUP_USER') {
    if (!payload || !gatewayClean_(payload.email)) {
      throw new Error('Email user wajib dikirim.');
    }
    return;
  }

  const schoolId = gatewayClean_(payload && payload.schoolId).toUpperCase();
  if (!schoolId) throw new Error('schoolId wajib dikirim.');

  if (action === 'SPREADSHEET_APPEND') {
    const sheet = gatewayClean_(payload.sheet);
    if (!sheet) throw new Error('Sheet tujuan wajib dikirim.');

    const configured = PropertiesService.getScriptProperties()
      .getProperty('GATEWAY_SHEETS_' + schoolId) || '';
    const allowedSheets = configured.split(',').map(gatewayClean_).filter(Boolean);

    if (!allowedSheets.length) {
      throw new Error('Belum ada sheet yang diizinkan untuk gateway sekolah ' + schoolId + '.');
    }
    if (allowedSheets.indexOf(sheet) < 0) {
      throw new Error('Sheet tidak diizinkan untuk gateway: ' + sheet);
    }
  }

  if (action === 'DRIVE_UPLOAD') {
    if (!payload || !payload.base64) throw new Error('Data upload belum dikirim.');
  }

  if (action === 'PDF_CREATE') {
    if (!payload || !payload.html) throw new Error('HTML PDF belum dikirim.');
  }
}
