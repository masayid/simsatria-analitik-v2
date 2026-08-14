/**
 * SIM SATRIA — TAHAP 8.14
 * Cross-School PDF Isolation.
 *
 * Pengujian dijalankan sebagai USER_ACCESSING.
 * Payload sengaja membawa schoolId/folderId palsu. Client Gateway wajib
 * mengunci schoolId ke session user dan Gateway wajib mengabaikan folderId.
 */
function testGatewayPDFCrossSchoolAsCurrentUser() {
  const email = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const expectedEmail = 'kurikulum.sman3pwr@gmail.com';
  const expectedSchool = 'SMANTI03PWJ';
  const expectedRole = 'GURU';
  const menu = 'DASHBOARD';

  const forgedSchool = clean_(PropertiesService.getScriptProperties().getProperty('SECURITY_TEST_SCHOOL_ID_2')).toUpperCase();
  const forgedFolderId = clean_(PropertiesService.getScriptProperties().getProperty('SECURITY_TEST_DRIVE_FOLDER_ID_2'));

  if (!email) throw new Error('Email user aktif tidak tersedia. Jalankan dari Web App setelah login Google.');
  if (email !== expectedEmail) throw new Error('Pengujian 8.14 harus dijalankan sebagai ' + expectedEmail + '. Akun aktif: ' + email);
  if (!forgedSchool || !forgedFolderId) throw new Error('Konfigurasi cross-school belum tersedia. Jalankan setup29_prepareCrossSchoolUploadTest() sekali sebagai SETUP_OWNER.');
  if (forgedSchool === expectedSchool) throw new Error('Sekolah pembanding harus berbeda dari sekolah aktif.');

  const sessionResponse = getSessionContext();
  const context = sessionResponse && sessionResponse.ok && sessionResponse.data ? sessionResponse.data : sessionResponse;
  if (!context || !context.user || !context.school) throw new Error('Session context user/sekolah tidak tersedia.');

  const actualSchool = clean_(context.school.idSekolah || context.school.id_sekolah).toUpperCase();
  const actualFolderId = clean_(context.school.driveFolderId || context.school.drive_folder_id);
  const role = clean_(context.user.role).toUpperCase();
  const sessionEmail = clean_(context.user.email || email).toLowerCase();

  if (sessionEmail !== email) throw new Error('Email session tidak konsisten.');
  if (actualSchool !== expectedSchool) throw new Error('School context salah. Diharapkan ' + expectedSchool + ', diperoleh ' + actualSchool);
  if (role !== expectedRole) throw new Error('Role salah. Diharapkan GURU, diperoleh ' + role);
  if (!actualFolderId) throw new Error('driveFolderId sekolah aktif tidak tersedia pada session context.');

  requirePermission_(APP_CONFIG.PERMISSION.PDF, menu);

  const timestamp = new Date();
  const stamp = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const marker = 'PDF_CROSS_SCHOOL_' + Utilities.getUuid();
  const fileName = 'SIM_SATRIA_PDF_CROSS_SCHOOL_' + stamp;
  const html = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>body{font-family:Arial,sans-serif;padding:40px;color:#173d2f}h1{font-size:24px}td{border:1px solid #cbd8d1;padding:10px}.label{font-weight:bold;width:190px}table{border-collapse:collapse;width:100%}</style>',
    '</head><body><h1>SIM SATRIA — TAHAP 8.14 PDF ISOLATION</h1><table>',
    '<tr><td class="label">Status</td><td>OK</td></tr>',
    '<tr><td class="label">User</td><td>' + escapeHtml_(email) + '</td></tr>',
    '<tr><td class="label">Actual School</td><td>' + escapeHtml_(actualSchool) + '</td></tr>',
    '<tr><td class="label">Forged School</td><td>' + escapeHtml_(forgedSchool) + '</td></tr>',
    '<tr><td class="label">Test Marker</td><td>' + escapeHtml_(marker) + '</td></tr>',
    '<tr><td class="label">Created At</td><td>' + escapeHtml_(timestamp.toISOString()) + '</td></tr>',
    '</table></body></html>'
  ].join('');

  // SECURITY NEGATIVE TEST:
  // Payload sengaja membawa school/folder palsu. gatewayCall_() membuang
  // schoolId payload dan menggantinya dengan school dari session user.
  // GatewayPDF kemudian mengabaikan seluruh field folder dari payload dan
  // memilih folder berdasarkan schoolId efektif.
  const gatewayResult = pdfViaGateway(menu, {
    name: fileName,
    html: html,
    marker: marker,
    schoolId: forgedSchool,
    folderId: forgedFolderId,
    driveFolderId: forgedFolderId,
    targetFolderId: forgedFolderId
  });

  if (!gatewayResult || gatewayResult.ok !== true) {
    throw new Error('Gateway PDF menolak request: ' + (gatewayResult && gatewayResult.message ? gatewayResult.message : 'respons tidak sukses.'));
  }

  const data = gatewayResult.data || {};
  const effectiveSchool = clean_(data.schoolId || data.idSekolah || '').toUpperCase();
  const effectiveFolderId = clean_(data.folderId || data.driveFolderId || data.targetFolderId || '');
  const fileId = data.fileId || data.id || '';
  const fileNameResult = data.fileName || data.name || (fileName + '.pdf');
  const fileUrl = data.fileUrl || data.url || '';

  // Verifikasi utama tidak lagi bergantung pada DriveApp user biasa.
  // Gateway mengembalikan metadata folder yang benar-benar dipakai saat
  // createFile(), sehingga dapat dibandingkan dengan folder session user.
  const schoolOverrideBlocked = effectiveSchool === actualSchool && effectiveSchool !== forgedSchool;
  const folderOverrideBlocked = effectiveFolderId === actualFolderId && effectiveFolderId !== forgedFolderId;
  const folderVerification = folderOverrideBlocked ? 'PASS' : 'FAIL';
  const passed = schoolOverrideBlocked && folderOverrideBlocked;

  const result = {
    ok: passed,
    test: 'TAHAP 8.14 — CROSS-SCHOOL PDF ISOLATION',
    user: email,
    role: role,
    actualSchool: actualSchool,
    forgedSchool: forgedSchool,
    effectiveSchool: effectiveSchool,
    schoolOverride: schoolOverrideBlocked ? 'BLOCKED' : 'NOT_BLOCKED',
    forgedFolderId: '[hidden]',
    effectiveFolder: folderOverrideBlocked ? '[actual school folder]' : '[unexpected folder]',
    folderOverride: folderOverrideBlocked ? 'BLOCKED' : 'NOT_BLOCKED',
    folderVerification: folderVerification,
    gateway: 'PASS',
    pdfCreate: 'PASS',
    crossSchool: passed ? 'PASS' : 'FAIL',
    fileId: fileId,
    fileName: fileNameResult,
    fileUrl: fileUrl,
    message: passed
      ? 'schoolId dan folderId palsu tidak dapat mengubah target PDF. PDF tetap diarahkan ke storage sekolah pengguna.'
      : 'BAHAYA: target PDF berpotensi dipengaruhi payload cross-school.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
