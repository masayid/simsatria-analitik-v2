/** Validasi allowlist operasi gateway. */
function gatewayRequireAction_(action) {
  const allowed = ['SPREADSHEET_APPEND', 'DRIVE_UPLOAD', 'PDF_CREATE'];
  if (allowed.indexOf(action) < 0) throw new Error('Action gateway tidak diizinkan.');
}
