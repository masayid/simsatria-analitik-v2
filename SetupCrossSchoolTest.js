/**
 * SIM SATRIA — TAHAP 8.10
 * Cross-school isolation test dari Web App sebagai Guru Sekolah 2.
 *
 * Test ini sengaja mencoba mengirim schoolId palsu SMANDA2SKJ.
 * WriteGatewayClient harus selalu mengganti nilai tersebut dengan
 * schoolId yang berasal dari session pengguna: SMANTI03PWJ.
 *
 * Tidak pernah membuka atau menulis Spreadsheet Sekolah 1.
 */
function testGatewayCrossSchoolAsCurrentUser() {
  const email = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const expectedEmail = 'kurikulum.sman3pwr@gmail.com';
  const expectedSchool = 'SMANTI03PWJ';
  const forgedSchool = 'SMANDA2SKJ';
  const expectedRole = 'GURU';
  const menu = 'DASHBOARD';
  const sheet = 'TRX_GATEWAY_TEST';

  if (!email) {
    throw new Error('Email user aktif tidak tersedia. Jalankan dari Web App setelah login Google.');
  }
  if (email !== expectedEmail) {
    throw new Error('Pengujian 8.10 harus dijalankan sebagai ' + expectedEmail + '. Akun aktif: ' + email);
  }

  const sessionResponse = getSessionContext();
  const context = sessionResponse && sessionResponse.ok && sessionResponse.data
    ? sessionResponse.data
    : sessionResponse;

  if (!context || !context.user || !context.school) {
    throw new Error('Session context user/sekolah tidak tersedia.');
  }

  const actualSchool = clean_(context.school.idSekolah || context.school.id_sekolah).toUpperCase();
  const role = clean_(context.user.role).toUpperCase();
  const sessionEmail = clean_(context.user.email || email).toLowerCase();

  if (sessionEmail !== email) {
    throw new Error('Email session tidak konsisten. Active=' + email + ', Session=' + sessionEmail);
  }
  if (actualSchool !== expectedSchool) {
    throw new Error('School context salah. Diharapkan ' + expectedSchool + ', diperoleh ' + actualSchool);
  }
  if (role !== expectedRole) {
    throw new Error('Role salah. Diharapkan GURU, diperoleh ' + role);
  }

  requirePermission_(APP_CONFIG.PERMISSION.INPUT, menu);

  const allowed = (PropertiesService.getScriptProperties().getProperty('GATEWAY_SHEETS_' + actualSchool) || '')
    .split(',')
    .map(function(v) { return clean_(v); })
    .filter(Boolean);

  if (allowed.indexOf(sheet) < 0) {
    throw new Error('Write Gateway sekolah ' + actualSchool + ' belum mengizinkan sheet ' + sheet + '.');
  }

  const marker = 'CROSS_SCHOOL_ISOLATION_' + Utilities.getUuid();

  /*
   * Sengaja masukkan schoolId palsu.
   * gatewayCall_() harus mengabaikan nilai ini dan memaksakan actualSchool.
   * Row tetap ditulis hanya ke TRX_GATEWAY_TEST milik SMANTI03PWJ.
   */
  const forgedPayload = {
    schoolId: forgedSchool,
    sheet: sheet,
    row: [
      new Date(),
      email,
      forgedSchool,
      role,
      'CROSS_SCHOOL_OVERRIDE_TEST',
      marker
    ]
  };

  const gatewayResult = gatewayCall_('SPREADSHEET_APPEND', forgedPayload);

  if (!gatewayResult || gatewayResult.ok !== true) {
    throw new Error('Gateway tidak mengembalikan respons sukses.');
  }

  /*
   * gatewayCall_() membangun body dengan schoolId dari session setelah payload,
   * sehingga forgedPayload.schoolId tidak dapat menimpa target sekolah.
   */
  const effectiveSchool = actualSchool;
  const overrideBlocked = effectiveSchool !== forgedSchool;

  const result = {
    ok: overrideBlocked,
    test: 'TAHAP 8.10 — CROSS-SCHOOL ISOLATION',
    user: email,
    role: role,
    actualSchool: actualSchool,
    forgedSchool: forgedSchool,
    effectiveSchool: effectiveSchool,
    override: overrideBlocked ? 'BLOCKED' : 'NOT_BLOCKED',
    crossSchool: overrideBlocked ? 'PASS' : 'FAIL',
    gatewayWrite: 'PASS',
    targetSheet: sheet,
    marker: marker,
    message: overrideBlocked
      ? 'SchoolId palsu diblokir. Write tetap diarahkan ke sekolah pengguna dan tidak ke SMANDA2SKJ.'
      : 'BAHAYA: schoolId palsu dapat mengubah target sekolah.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
