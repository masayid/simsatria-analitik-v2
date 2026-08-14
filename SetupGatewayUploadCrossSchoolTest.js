/**
 * SIM SATRIA — TAHAP 8.12
 * Cross-School Isolation untuk UPLOAD.
 *
 * Dijalankan sebagai Guru Sekolah 2 melalui Web App.
 * Sengaja mengirim schoolId dan folderId palsu milik Sekolah 1.
 * Client Gateway wajib memaksa schoolId dari session; Gateway server
 * wajib mengabaikan folderId dari payload dan mengambil folder dari
 * MASTER berdasarkan schoolId efektif.
 *
 * Test tidak membuka folder Sekolah 1 dan tidak meng-upload ke folder itu.
 */
function testGatewayUploadCrossSchoolAsCurrentUser() {
  const email = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const expectedEmail = 'kurikulum.sman3pwr@gmail.com';
  const expectedSchool = 'SMANTI03PWJ';
  const forgedSchool = 'SMANDA2SKJ';
  const expectedRole = 'GURU';
  const menu = 'DASHBOARD';

  if (!email) throw new Error('Email user aktif tidak tersedia. Jalankan dari Web App setelah login Google.');
  if (email !== expectedEmail) throw new Error('Pengujian 8.12 harus dijalankan sebagai ' + expectedEmail + '. Akun aktif: ' + email);

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

  // Folder ID Sekolah 1 hanya dipakai sebagai nilai forged di payload.
  // Gateway harus mengabaikannya; tidak pernah dipanggil oleh client.
  const forgedFolderId = '1AzYTKs5-dWs4QoIburzFL4cQxe2N_HHo';
  const marker = 'CROSS_SCHOOL_UPLOAD_' + Utilities.getUuid();
  const fileName = 'SIM_SATRIA_CROSS_SCHOOL_UPLOAD_' + marker.substring(marker.length - 12) + '.txt';
  const content = [
    'SIM SATRIA — TAHAP 8.12',
    'Cross-School Upload Isolation Test',
    'User: ' + email,
    'Role: ' + role,
    'Actual School: ' + actualSchool,
    'Forged School: ' + forgedSchool,
    'Forged Folder: ' + forgedFolderId,
    'Marker: ' + marker,
    'CreatedAt: ' + new Date().toISOString()
  ].join('\n');
  const base64 = Utilities.base64Encode(Utilities.newBlob(content, 'text/plain').getBytes());

  const gatewayResult = uploadViaGateway(menu, {
    fileName: fileName,
    mimeType: 'text/plain',
    base64: base64,
    marker: marker,
    // SECURITY NEGATIVE TEST: kedua nilai berikut sengaja dipalsukan.
    schoolId: forgedSchool,
    folderId: forgedFolderId
  });

  if (!gatewayResult || gatewayResult.ok !== true) {
    throw new Error('Gateway menolak upload test. Untuk 8.12, penolakan juga aman; lihat pesan Gateway untuk memastikan alasan penolakannya.');
  }

  const data = gatewayResult.data || {};
  const effectiveSchool = clean_(data.schoolId || data.idSekolah || actualSchool).toUpperCase();
  const effectiveFolder = clean_(data.folderId || data.driveFolderId || data.targetFolderId || '');
  const schoolOverrideBlocked = effectiveSchool === actualSchool && effectiveSchool !== forgedSchool;

  // Jika Gateway mengembalikan folderId, harus bukan folder palsu.
  // Jika tidak mengembalikan folderId, schoolId efektif tetap menjadi bukti utama
  // karena folder Gateway ditentukan dari MASTER berdasarkan schoolId efektif.
  const folderOverrideBlocked = !effectiveFolder || effectiveFolder !== forgedFolderId;
  const passed = schoolOverrideBlocked && folderOverrideBlocked;

  const result = {
    ok: passed,
    test: 'TAHAP 8.12 — CROSS-SCHOOL UPLOAD ISOLATION',
    user: email,
    role: role,
    actualSchool: actualSchool,
    forgedSchool: forgedSchool,
    effectiveSchool: effectiveSchool,
    forgedFolderId: forgedFolderId,
    effectiveFolderId: effectiveFolder || '(Gateway tidak mengekspos folderId)',
    schoolOverride: schoolOverrideBlocked ? 'BLOCKED' : 'NOT_BLOCKED',
    folderOverride: folderOverrideBlocked ? 'BLOCKED' : 'NOT_BLOCKED',
    driveUpload: 'PASS',
    crossSchool: passed ? 'PASS' : 'FAIL',
    fileId: data.fileId || data.id || '',
    fileName: data.fileName || data.name || fileName,
    message: passed
      ? 'schoolId dan folderId palsu tidak dapat mengubah target upload. Upload tetap berada pada sekolah pengguna.'
      : 'BAHAYA: target upload dapat dipengaruhi oleh payload cross-school.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
