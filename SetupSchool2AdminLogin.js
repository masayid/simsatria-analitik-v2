/**
 * SIM SATRIA — TAHAP 8.6
 * Verifikasi identitas dan konteks login ADMIN_SEKOLAH sekolah kedua.
 *
 * Catatan:
 * Fungsi setup dijalankan dari Apps Script Editor menggunakan akun yang sedang aktif.
 * Karena itu hasil ini memverifikasi identitas Session + MASTER_USER + MASTER_SEKOLAH.
 * Pengujian login Web App nyata tetap dilakukan dengan membuka deployment sebagai user.
 */

function setup28_testSchool2AdminLogin() {
  const expectedEmail = 'masayid11@gmail.com';
  const expectedSchoolId = 'SMANTI03PWJ';
  const expectedRole = 'ADMIN_SEKOLAH';

  const activeEmail = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const effectiveEmail = clean_(Session.getEffectiveUser().getEmail()).toLowerCase();

  const user = findUserByEmail_(expectedEmail);
  if (!user) throw new Error('User ADMIN sekolah kedua tidak ditemukan: ' + expectedEmail);

  const school = findSchoolById_(expectedSchoolId);
  if (!school) throw new Error('Sekolah kedua tidak ditemukan atau tidak ACTIVE: ' + expectedSchoolId);

  const checks = {
    activeAccount: activeEmail === expectedEmail,
    effectiveAccount: effectiveEmail === expectedEmail,
    userEmail: clean_(user.email).toLowerCase() === expectedEmail,
    userSchool: clean_(user.id_sekolah).toUpperCase() === expectedSchoolId,
    userRole: clean_(user.role).toUpperCase() === expectedRole,
    userStatus: clean_(user.status).toUpperCase() === 'ACTIVE',
    schoolStatus: clean_(school.status).toUpperCase() === 'ACTIVE',
    spreadsheetMatch: clean_(school.spreadsheet_id) !== '',
    driveMatch: clean_(school.drive_folder_id) !== '',
    dashboardRead: getPermissions_(expectedRole, 'DASHBOARD').indexOf('READ') !== -1
  };

  const result = {
    ok: Object.keys(checks).every(function(key) { return checks[key] === true; }),
    expected: {
      email: expectedEmail,
      idSekolah: expectedSchoolId,
      role: expectedRole
    },
    session: {
      activeEmail: activeEmail,
      effectiveEmail: effectiveEmail
    },
    user: {
      idUser: clean_(user.id_user),
      nama: clean_(user.nama),
      email: clean_(user.email).toLowerCase(),
      idSekolah: clean_(user.id_sekolah).toUpperCase(),
      role: clean_(user.role).toUpperCase(),
      status: clean_(user.status).toUpperCase()
    },
    school: {
      idSekolah: clean_(school.id_sekolah).toUpperCase(),
      namaSekolah: clean_(school.nama_sekolah),
      status: clean_(school.status).toUpperCase(),
      spreadsheetId: clean_(school.spreadsheet_id),
      driveFolderId: clean_(school.drive_folder_id)
    },
    checks: checks,
    message: Object.keys(checks).every(function(key) { return checks[key] === true; })
      ? 'Konteks ADMIN_SEKOLAH sekolah kedua valid.'
      : 'Konteks ADMIN_SEKOLAH belum valid. Periksa detail checks.'
  };

  Logger.log('activeAccount    : ' + (checks.activeAccount ? 'PASS' : 'FAIL'));
  Logger.log('effectiveAccount : ' + (checks.effectiveAccount ? 'PASS' : 'FAIL'));
  Logger.log('userEmail        : ' + (checks.userEmail ? 'PASS' : 'FAIL'));
  Logger.log('userSchool       : ' + (checks.userSchool ? 'PASS' : 'FAIL'));
  Logger.log('userRole         : ' + (checks.userRole ? 'PASS' : 'FAIL'));
  Logger.log('userStatus       : ' + (checks.userStatus ? 'PASS' : 'FAIL'));
  Logger.log('schoolStatus     : ' + (checks.schoolStatus ? 'PASS' : 'FAIL'));
  Logger.log('spreadsheet      : ' + (checks.spreadsheetMatch ? 'PASS' : 'FAIL'));
  Logger.log('drive            : ' + (checks.driveMatch ? 'PASS' : 'FAIL'));
  Logger.log('dashboard READ   : ' + (checks.dashboardRead ? 'PASS' : 'FAIL'));
  Logger.log('SCHOOL           : ' + expectedSchoolId);

  return result;
}
