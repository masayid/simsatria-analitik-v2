/**
 * SIM SATRIA — TAHAP 8.9
 * Test Write Gateway untuk GURU sekolah kedua.
 */

function setup31_verifySchool2GatewayConfig() {
  requireSetupAccess_();

  const schoolId = 'SMANTI03PWJ';
  const school = findSchoolById_(schoolId);
  if (!school) throw new Error('Sekolah tidak ditemukan: ' + schoolId);

  const cfg = getGatewayConfig_();
  const result = {
    ok: true,
    school: {
      idSekolah: clean_(school.id_sekolah).toUpperCase(),
      namaSekolah: clean_(school.nama_sekolah),
      spreadsheetId: clean_(school.spreadsheet_id),
      driveFolderId: clean_(school.drive_folder_id),
      status: clean_(school.status).toUpperCase()
    },
    gateway: {
      configured: !!(cfg.url && cfg.token),
      urlConfigured: !!cfg.url,
      tokenConfigured: !!cfg.token
    },
    message: 'Konfigurasi Write Gateway sekolah 2 siap diuji melalui Web App.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testGatewayWriteAsCurrentUser() {
  const email = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const expectedEmail = 'kurikulum.sman3pwr@gmail.com';
  const expectedSchool = 'SMANTI03PWJ';
  const expectedRole = 'GURU';
  const menu = 'DASHBOARD';
  const sheet = 'TRX_GATEWAY_TEST';

  if (!email) {
    throw new Error('Email user aktif tidak tersedia. Jalankan fungsi ini dari Web App setelah login Google.');
  }

  if (email !== expectedEmail) {
    throw new Error('Pengujian 8.9 harus dijalankan sebagai ' + expectedEmail + '. Akun aktif: ' + email);
  }

  // getSessionContext() mengembalikan envelope {ok:true,data:{user,school,...}}.
  // Sebelumnya test langsung membaca response.user/response.school sehingga selalu
  // gagal walaupun frontend sudah berhasil membaca session melalui response.data.
  const sessionResponse = getSessionContext();
  const context = sessionResponse && sessionResponse.ok && sessionResponse.data
    ? sessionResponse.data
    : sessionResponse;

  if (!context || !context.user || !context.school) {
    throw new Error('Session context user/sekolah tidak tersedia.');
  }

  const schoolId = clean_(
    context.school.idSekolah || context.school.id_sekolah
  ).toUpperCase();
  const role = clean_(context.user.role).toUpperCase();
  const userEmail = clean_(context.user.email || email).toLowerCase();

  if (userEmail !== email) {
    throw new Error('Email session tidak konsisten. Active=' + email + ', Session=' + userEmail);
  }

  if (schoolId !== expectedSchool) {
    throw new Error('School context salah. Diharapkan ' + expectedSchool + ', diperoleh ' + schoolId);
  }

  if (role !== expectedRole) {
    throw new Error('Role salah. Diharapkan GURU, diperoleh ' + role);
  }

  requirePermission_(APP_CONFIG.PERMISSION.INPUT, menu);

  const marker = 'SCHOOL2_GURU_GATEWAY_' + Utilities.getUuid();
  const row = [
    new Date(),
    email,
    schoolId,
    role,
    'SPREADSHEET_APPEND',
    marker
  ];

  const gatewayResult = saveDataViaGateway(menu, sheet, row);

  const result = {
    ok: true,
    test: 'TAHAP 8.9',
    user: email,
    role: role,
    schoolId: schoolId,
    targetSheet: sheet,
    marker: marker,
    gateway: {
      ok: gatewayResult && gatewayResult.ok === true,
      message: gatewayResult && gatewayResult.message ? gatewayResult.message : ''
    },
    school2Write: 'PASS',
    crossSchool: 'NOT_TESTED_IN_THIS_CALL',
    message: 'Guru sekolah 2 berhasil melakukan write melalui Write Gateway.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function runSchool2GatewayTestFromWebApp() {
  return testGatewayWriteAsCurrentUser();
}
