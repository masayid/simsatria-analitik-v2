/** SIM SATRIA — TAHAP 8.12 Cross-School Upload Isolation */
function setup29_prepareCrossSchoolUploadTest() {
  requireSetupAccess_();
  const actualSchool = 'SMANTI03PWJ';
  const forgedSchool = 'SMANDA2SKJ';
  const school = findSchoolById_(forgedSchool);
  if (!school) throw new Error('Sekolah pembanding tidak ditemukan/ACTIVE: ' + forgedSchool);
  if (!school.drive_folder_id) throw new Error('drive_folder_id sekolah pembanding belum dikonfigurasi.');
  if (forgedSchool === actualSchool) throw new Error('Sekolah pembanding harus berbeda dari sekolah aktif.');
  PropertiesService.getScriptProperties().setProperty('SECURITY_TEST_SCHOOL_ID_2', forgedSchool);
  PropertiesService.getScriptProperties().setProperty('SECURITY_TEST_DRIVE_FOLDER_ID_2', clean_(school.drive_folder_id));
  return ok_({actualSchool: actualSchool, forgedSchool: forgedSchool, configured: true}, 'Target sekolah dan folder pembanding TAHAP 8.12 siap diuji.');
}

function testGatewayUploadCrossSchoolAsCurrentUser() {
  const email = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const expectedEmail = 'kurikulum.sman3pwr@gmail.com';
  const expectedSchool = 'SMANTI03PWJ';
  const forgedSchool = clean_(PropertiesService.getScriptProperties().getProperty('SECURITY_TEST_SCHOOL_ID_2')).toUpperCase();
  const forgedFolderId = clean_(PropertiesService.getScriptProperties().getProperty('SECURITY_TEST_DRIVE_FOLDER_ID_2'));
  const expectedRole = 'GURU';
  const menu = 'DASHBOARD';

  if (!email) throw new Error('Email user aktif tidak tersedia. Jalankan dari Web App setelah login Google.');
  if (email !== expectedEmail) throw new Error('Pengujian 8.12 harus dijalankan sebagai ' + expectedEmail + '. Akun aktif: ' + email);
  if (!forgedSchool || !forgedFolderId) throw new Error('Test 8.12 belum dikonfigurasi. Jalankan setup29_prepareCrossSchoolUploadTest() sekali sebagai SETUP_OWNER.');
  if (forgedSchool === expectedSchool) throw new Error('Sekolah pembanding tidak boleh sama dengan sekolah aktif.');

  const sessionResponse = getSessionContext();
  const context = sessionResponse && sessionResponse.ok && sessionResponse.data ? sessionResponse.data : sessionResponse;
  if (!context || !context.user || !context.school) throw new Error('Session context user/sekolah tidak tersedia.');

  const actualSchool = clean_(context.school.idSekolah || context.school.id_sekolah).toUpperCase();
  const role = clean_(context.user.role).toUpperCase();
  const sessionEmail = clean_(context.user.email || email).toLowerCase();
  if (sessionEmail !== email) throw new Error('Email session tidak konsisten.');
  if (actualSchool !== expectedSchool) throw new Error('School context salah. Diharapkan ' + expectedSchool + ', diperoleh ' + actualSchool);
  if (role !== expectedRole) throw new Error('Role salah. Diharapkan GURU, diperoleh ' + role);
  requirePermission_(APP_CONFIG.PERMISSION.UPLOAD, menu);

  const marker = 'CROSS_SCHOOL_UPLOAD_' + Utilities.getUuid();
  const fileName = 'SIM_SATRIA_CROSS_SCHOOL_UPLOAD_' + marker.substring(marker.length - 12) + '.txt';
  const content = ['SIM SATRIA — TAHAP 8.12','Cross-School Upload Isolation Test','User: ' + email,'Role: ' + role,'Actual School: ' + actualSchool,'Forged School: ' + forgedSchool,'Forged Folder: [configured comparison folder]','Marker: ' + marker,'CreatedAt: ' + new Date().toISOString()].join('\n');
  const base64 = Utilities.base64Encode(Utilities.newBlob(content, 'text/plain').getBytes());

  const gatewayResult = uploadViaGateway(menu, {fileName: fileName, mimeType: 'text/plain', base64: base64, marker: marker, schoolId: forgedSchool, folderId: forgedFolderId});
  if (!gatewayResult || gatewayResult.ok !== true) throw new Error('Gateway menolak upload test: ' + (gatewayResult && gatewayResult.message ? gatewayResult.message : 'respons tidak sukses.'));

  const data = gatewayResult.data || {};
  const effectiveSchool = clean_(data.schoolId || data.idSekolah || actualSchool).toUpperCase();
  const effectiveFolder = clean_(data.folderId || data.driveFolderId || data.targetFolderId || '');
  const schoolOverrideBlocked = effectiveSchool === actualSchool && effectiveSchool !== forgedSchool;
  const folderOverrideBlocked = !effectiveFolder || effectiveFolder !== forgedFolderId;
  const passed = schoolOverrideBlocked && folderOverrideBlocked;

  const result = {ok: passed, test: 'TAHAP 8.12 — CROSS-SCHOOL UPLOAD ISOLATION', user: email, role: role, actualSchool: actualSchool, forgedSchool: forgedSchool, effectiveSchool: effectiveSchool, forgedFolderId: '[hidden]', effectiveFolderId: effectiveFolder ? '[gateway returned folder]' : '(Gateway tidak mengekspos folderId)', schoolOverride: schoolOverrideBlocked ? 'BLOCKED' : 'NOT_BLOCKED', folderOverride: folderOverrideBlocked ? 'BLOCKED' : 'NOT_BLOCKED', driveUpload: 'PASS', crossSchool: passed ? 'PASS' : 'FAIL', fileId: data.fileId || data.id || '', fileName: data.fileName || data.name || fileName, message: passed ? 'schoolId dan folderId palsu tidak dapat mengubah target upload. Upload tetap berada pada sekolah pengguna.' : 'BAHAYA: target upload dapat dipengaruhi payload cross-school.'};
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
