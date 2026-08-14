/**
 * SIM SATRIA — TAHAP 8.11
 * Test upload melalui Write Gateway sebagai GURU Sekolah 2.
 * Tidak menggunakan DriveApp pada client.
 */
function testGatewayUploadAsCurrentUser() {
  const email = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const expectedEmail = 'kurikulum.sman3pwr@gmail.com';
  const expectedSchool = 'SMANTI03PWJ';
  const expectedRole = 'GURU';
  const menu = 'DASHBOARD';

  if (!email) {
    throw new Error('Email user aktif tidak tersedia. Jalankan dari Web App setelah login Google.');
  }
  if (email !== expectedEmail) {
    throw new Error('Pengujian 8.11 harus dijalankan sebagai ' + expectedEmail + '. Akun aktif: ' + email);
  }

  const sessionResponse = getSessionContext();
  const context = sessionResponse && sessionResponse.ok && sessionResponse.data
    ? sessionResponse.data
    : sessionResponse;

  if (!context || !context.user || !context.school) {
    throw new Error('Session context user/sekolah tidak tersedia.');
  }

  const schoolId = clean_(context.school.idSekolah || context.school.id_sekolah).toUpperCase();
  const role = clean_(context.user.role).toUpperCase();
  const sessionEmail = clean_(context.user.email || email).toLowerCase();

  if (sessionEmail !== email) {
    throw new Error('Email session tidak konsisten. Active=' + email + ', Session=' + sessionEmail);
  }
  if (schoolId !== expectedSchool) {
    throw new Error('School context salah. Diharapkan ' + expectedSchool + ', diperoleh ' + schoolId);
  }
  if (role !== expectedRole) {
    throw new Error('Role salah. Diharapkan GURU, diperoleh ' + role);
  }

  requirePermission_(APP_CONFIG.PERMISSION.UPLOAD, menu);

  const marker = 'GATEWAY_UPLOAD_' + Utilities.getUuid();
  const fileName = 'SIM_SATRIA_GATEWAY_TEST_' + marker.substring(marker.length - 12) + '.txt';
  const content = [
    'SIM SATRIA — TAHAP 8.11',
    'Write Gateway Upload Test',
    'User: ' + email,
    'Role: ' + role,
    'School: ' + schoolId,
    'Marker: ' + marker,
    'CreatedAt: ' + new Date().toISOString()
  ].join('\n');

  const base64 = Utilities.base64Encode(Utilities.newBlob(content, 'text/plain').getBytes());

  /*
   * Upload wajib melalui Write Gateway.
   * Jangan memakai DriveApp aquí; Gateway yang menentukan folder sekolah.
   */
  const gatewayResult = uploadViaGateway(menu, {
    fileName: fileName,
    mimeType: 'text/plain',
    base64: base64,
    marker: marker
  });

  if (!gatewayResult || gatewayResult.ok !== true) {
    throw new Error('Write Gateway tidak mengembalikan respons upload sukses.');
  }

  const data = gatewayResult.data || {};
  const result = {
    ok: true,
    test: 'TAHAP 8.11 — TEST UPLOAD GATEWAY',
    user: email,
    role: role,
    school: schoolId,
    gateway: 'PASS',
    driveUpload: 'PASS',
    fileName: fileName,
    marker: marker,
    folderSchool: data.schoolId || data.idSekolah || schoolId,
    fileId: data.fileId || data.id || '',
    fileUrl: data.fileUrl || data.url || '',
    message: 'Upload berhasil melalui Write Gateway. Folder ditentukan oleh Gateway berdasarkan sekolah pengguna.'
  };

  if (clean_(result.folderSchool).toUpperCase() !== schoolId) {
    result.ok = false;
    result.driveUpload = 'FAIL';
    result.message = 'BAHAYA: folder upload tidak sesuai dengan sekolah pengguna.';
  }

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
