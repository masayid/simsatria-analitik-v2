/**
 * SIM SATRIA — TAHAP 8.13
 * Test PDF Gateway sebagai user aktif Web App.
 */
function testGatewayPDFAsCurrentUser() {
  const email = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const expectedEmail = 'kurikulum.sman3pwr@gmail.com';
  const expectedSchool = 'SMANTI03PWJ';
  const expectedRole = 'GURU';
  const menu = 'DASHBOARD';

  if (!email) throw new Error('Email user aktif tidak tersedia. Jalankan dari Web App setelah login Google.');
  if (email !== expectedEmail) throw new Error('Pengujian 8.13 harus dijalankan sebagai ' + expectedEmail + '. Akun aktif: ' + email);

  const sessionResponse = getSessionContext();
  const context = sessionResponse && sessionResponse.ok && sessionResponse.data ? sessionResponse.data : sessionResponse;
  if (!context || !context.user || !context.school) throw new Error('Session context user/sekolah tidak tersedia.');

  const actualSchool = clean_(context.school.idSekolah || context.school.id_sekolah).toUpperCase();
  const role = clean_(context.user.role).toUpperCase();
  const sessionEmail = clean_(context.user.email || email).toLowerCase();

  if (sessionEmail !== email) throw new Error('Email session tidak konsisten.');
  if (actualSchool !== expectedSchool) throw new Error('School context salah. Diharapkan ' + expectedSchool + ', diperoleh ' + actualSchool);
  if (role !== expectedRole) throw new Error('Role salah. Diharapkan GURU, diperoleh ' + role);

  requirePermission_(APP_CONFIG.PERMISSION.PDF, menu);

  const timestamp = new Date();
  const stamp = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const fileName = 'SIM_SATRIA_GATEWAY_PDF_TEST_' + stamp;
  const html = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>body{font-family:Arial,sans-serif;padding:40px;color:#173d2f}h1{font-size:24px;margin-bottom:24px}table{border-collapse:collapse;width:100%}td{border:1px solid #cbd8d1;padding:10px}.label{font-weight:bold;width:190px}</style>',
    '</head><body><h1>SIM SATRIA — TEST PDF GATEWAY</h1><table>',
    '<tr><td class="label">Status</td><td>OK</td></tr>',
    '<tr><td class="label">User</td><td>' + escapeHtml_(email) + '</td></tr>',
    '<tr><td class="label">Role</td><td>' + escapeHtml_(role) + '</td></tr>',
    '<tr><td class="label">Sekolah</td><td>' + escapeHtml_(actualSchool) + '</td></tr>',
    '<tr><td class="label">Waktu</td><td>' + escapeHtml_(timestamp.toISOString()) + '</td></tr>',
    '<tr><td class="label">Test</td><td>TAHAP 8.13 — PDF Gateway</td></tr>',
    '</table></body></html>'
  ].join('');

  const gatewayResult = pdfViaGateway(menu, {name: fileName, html: html});
  if (!gatewayResult || gatewayResult.ok === false) throw new Error('Gateway PDF tidak mengembalikan hasil sukses.');

  const data = gatewayResult.data || gatewayResult;
  const result = {
    ok: true,
    test: 'TAHAP 8.13 — PDF GATEWAY',
    user: email,
    role: role,
    schoolId: actualSchool,
    gateway: 'PASS',
    pdfCreate: 'PASS',
    fileId: data.fileId || data.id || '',
    fileName: data.fileName || data.name || (fileName + '.pdf'),
    fileUrl: data.fileUrl || data.url || '',
    message: 'PDF berhasil dibuat melalui Write Gateway. Target sekolah ditentukan oleh Gateway berdasarkan session pengguna.'
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
