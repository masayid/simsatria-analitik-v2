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

  // Sengaja mengirim target palsu. gatewayCall_() akan memaksa schoolId
  // kembali ke sekolah session user; folderId tetap dikirim sebagai negative test.
  const gatewayResult = pdfViaGateway(menu, {
    name: fileName,
    html: html,
    marker: marker,
    schoolId: forgedSchool,
    folderId: forgedFolderId,
    driveFolderId: forgedFolderId,
    targetFolderId: forgedFolderId
  });

  if (!gatewayResult || gatewayResult.ok !== true) throw new Error('Gateway PDF menolak request: ' + (gatewayResult && gatewayResult.message ? gatewayResult.message : 'respons tidak sukses.'));

  const data = gatewayResult.data || {};
  const effectiveSchool = clean_(data.schoolId || data.idSekolah || actualSchool).toUpperCase();
  const reportedFolder = clean_(data.folderId || data.driveFolderId || data.targetFolderId || '');
  const fileId = data.fileId || data.id || '';
  const fileNameResult = data.fileName || data.name || (fileName + '.pdf');
  const fileUrl = data.fileUrl || data.url || '';

  const schoolOverrideBlocked = effectiveSchool === actualSchool && effectiveSchool !== forgedSchool;

  let folderVerification = 'NOT_VERIFIED';
  let effectiveFolder = reportedFolder;
  if (reportedFolder) {
    folderVerification = reportedFolder === actualFolderId && reportedFolder !== forgedFolderId ? 'PASS' : 'FAIL';
  } else if (fileId) {
    try {
      const file = DriveApp.getFileById(fileId);
      const parents = file.getParents();
      const parentIds = [];
      while (parents.hasNext()) parentIds.push(parents.next().getId());
      const actualFound = parentIds.indexOf(actualFolderId) >= 0;
      const forgedFound = parentIds.indexOf(forgedFolderId) >= 0;
      folderVerification = actualFound && !forgedFound ? 'PASS' : 'FAIL';
      effectiveFolder = actualFound ? '[actual school folder]' : (parentIds.length ? '[other folder]' : '[no parent reported]');
    } catch (e) {
      folderVerification = 'UNAVAILABLE';
      effectiveFolder = '[folder verification unavailable for current user]';
    }
  }

  const folderOverrideBlocked = folderVerification === 'PASS';
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
    effectiveFolder: effectiveFolder || '(Gateway tidak mengekspos folder)',
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
      : 'BAHAYA: target PDF berpotensi dipengaruhi payload cross-school atau lokasi file belum dapat diverifikasi.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
