/** Allowlist operasi gateway dan target resource. */
function gatewayRequireAction_(action, payload) {
  const allowed = ['SPREADSHEET_APPEND', 'DRIVE_UPLOAD', 'PDF_CREATE'];
  if (allowed.indexOf(action) < 0) throw new Error('Action gateway tidak diizinkan.');

  const schoolId = gatewayClean_(payload.schoolId);
  if (!schoolId) throw new Error('schoolId wajib dikirim.');

  if (action === 'SPREADSHEET_APPEND') {
    const sheet = gatewayClean_(payload.sheet);
    if (!sheet) throw new Error('Sheet tujuan wajib dikirim.');
    const configured = PropertiesService.getScriptProperties().getProperty('SHEETS_' + schoolId) || '';
    const allowedSheets = configured.split(',').map(gatewayClean_).filter(Boolean);
    if (allowedSheets.length && allowedSheets.indexOf(sheet) < 0) throw new Error('Sheet tidak diizinkan untuk sekolah ini.');
  }
}
