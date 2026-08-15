/** Allowlist operasi Gateway. */
function gatewayRequireAction_(action, payload) {
  const allowed = [
    'AUTH_LOOKUP_USER',
    'SPREADSHEET_ENSURE_SHEET',
    'SPREADSHEET_APPEND',
    'SPREADSHEET_UPDATE_ROW',
    'SPREADSHEET_DELETE_ROW',
    'SPREADSHEET_READ',
    'DRIVE_UPLOAD',
    'PDF_CREATE'
  ];
  if (allowed.indexOf(action) < 0) throw new Error('Action gateway tidak diizinkan.');

  if (action === 'AUTH_LOOKUP_USER') {
    if (!payload || !gatewayClean_(payload.email)) throw new Error('Email user wajib dikirim.');
    return;
  }

  const schoolId = gatewayClean_(payload && payload.schoolId).toUpperCase();
  if (!schoolId) throw new Error('schoolId wajib dikirim.');

  if (action === 'SPREADSHEET_ENSURE_SHEET') {
    const sheet = gatewayClean_(payload.sheet).toUpperCase();
    const allowedCreate = ['KELAS','GURU','KARYAWAN','SISWA'];
    if (allowedCreate.indexOf(sheet) < 0) {
      throw new Error('Gateway hanya mengizinkan pembuatan sheet KELAS, GURU, KARYAWAN, atau SISWA.');
    }
    if (!Array.isArray(payload.headers) || !payload.headers.length) {
      throw new Error('Header ' + sheet + ' wajib dikirim.');
    }
    return;
  }

  if (action === 'SPREADSHEET_APPEND' || action === 'SPREADSHEET_UPDATE_ROW' || action === 'SPREADSHEET_DELETE_ROW') {
    const sheet = gatewayClean_(payload.sheet).toUpperCase();
    if (!sheet) throw new Error('Sheet tujuan wajib dikirim.');
    if (sheet !== 'KELAS' && sheet !== 'GURU' && sheet !== 'KARYAWAN') {
      const configured = PropertiesService.getScriptProperties().getProperty('GATEWAY_SHEETS_' + schoolId) || '';
      const allowedSheets = configured.split(',').map(gatewayClean_).filter(Boolean);
      if (!allowedSheets.length) throw new Error('Belum ada sheet yang diizinkan untuk gateway sekolah ' + schoolId + '.');
      if (allowedSheets.indexOf(sheet) < 0) throw new Error('Sheet tidak diizinkan untuk gateway: ' + sheet);
    }
    if (action !== 'SPREADSHEET_APPEND') {
      const rowNo = Number(payload.rowNumber);
      if (!(rowNo >= 2 && isFinite(rowNo))) throw new Error('Nomor baris tidak valid.');
    }
  }

  if (action === 'SPREADSHEET_READ') {
    const sheet = gatewayClean_(payload.sheet).toUpperCase();
    const allowedRead = ['KELAS','GURU','KARYAWAN','TRX_AGENDA_GURU','SISWA'];
    if (allowedRead.indexOf(sheet) < 0) {
      throw new Error('Gateway hanya mengizinkan pembacaan sheet KELAS, GURU, KARYAWAN, TRX_AGENDA_GURU, dan SISWA.');
    }
  }

  if (action === 'DRIVE_UPLOAD') {
    if (!payload || !payload.base64) throw new Error('Data upload belum dikirim.');
  }
  if (action === 'PDF_CREATE') {
    if (!payload || !payload.html) throw new Error('HTML PDF belum dikirim.');
  }
}
