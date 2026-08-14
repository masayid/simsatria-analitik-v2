/**
 * SIM SATRIA — TAHAP 8.5
 * Permission & Menu test untuk sekolah kedua.
 * Tidak mengubah MASTER_ROLE_PERMISSION atau MASTER_MENU.
 */

function setup27_testSchool2Permissions() {
  requireSetupAccess_();

  const schoolId = 'SMANTI03PWJ';
  const school = findSchoolById_(schoolId);
  if (!school) throw new Error('Sekolah kedua belum terdaftar atau tidak ACTIVE: ' + schoolId);

  const expected = [
    {role: 'ADMIN_SEKOLAH', permissions: ['READ','INPUT','UPLOAD','PDF','ADMIN']},
    {role: 'GURU',          permissions: ['READ','INPUT','UPLOAD','PDF']},
    {role: 'WALI_KELAS',    permissions: ['READ','INPUT','UPLOAD','PDF']},
    {role: 'KARYAWAN',      permissions: ['READ','INPUT','UPLOAD','PDF']},
    {role: 'SISWA',         permissions: ['READ','INPUT','UPLOAD','PDF']}
  ];

  const users = readSheetObjects_(getMasterSpreadsheet_(), MASTER.USER)
    .filter(row => clean_(row.id_sekolah).toUpperCase() === schoolId)
    .filter(row => clean_(row.status).toUpperCase() === 'ACTIVE');

  const results = expected.map(function(item) {
    const user = users.find(function(row) {
      return clean_(row.role).toUpperCase() === item.role;
    });

    if (!user) {
      return {role: item.role, status: 'FAIL', reason: 'User ACTIVE dengan role ini tidak ditemukan.'};
    }

    const actual = getPermissions_(item.role, 'DASHBOARD');
    const missing = item.permissions.filter(function(permission) {
      return actual.indexOf(permission) === -1;
    });
    const unexpected = actual.filter(function(permission) {
      return item.permissions.indexOf(permission) === -1;
    });

    return {
      role: item.role,
      email: clean_(user.email).toLowerCase(),
      idSekolah: clean_(user.id_sekolah).toUpperCase(),
      expectedPermissions: item.permissions,
      actualPermissions: actual,
      missingPermissions: missing,
      unexpectedPermissions: unexpected,
      status: missing.length === 0 && unexpected.length === 0 ? 'PASS' : 'FAIL'
    };
  });

  const dashboardMenus = getMenusForRole_('ADMIN_SEKOLAH');
  const menuPass = dashboardMenus.some(function(menu) {
    return clean_(menu.kode_menu).toUpperCase() === 'DASHBOARD';
  });

  const menuResult = {
    menu: 'DASHBOARD',
    role: 'ADMIN_SEKOLAH',
    status: menuPass ? 'PASS' : 'FAIL',
    menus: dashboardMenus.map(function(menu) { return clean_(menu.kode_menu).toUpperCase(); })
  };

  const allRolesPass = results.every(function(item) { return item.status === 'PASS'; });
  const allSchoolPass = results.every(function(item) { return item.idSekolah === undefined || item.idSekolah === schoolId; });
  const ok = allRolesPass && allSchoolPass && menuResult.status === 'PASS';

  const result = {
    ok: ok,
    idSekolah: schoolId,
    school: {
      npsn: clean_(school.npsn),
      namaSekolah: clean_(school.nama_sekolah),
      spreadsheetId: clean_(school.spreadsheet_id)
    },
    roles: results,
    menu: menuResult,
    message: ok
      ? 'Permission dan menu sekolah kedua sesuai konfigurasi role.'
      : 'Permission/menu sekolah kedua belum sesuai. Periksa detail hasil pengujian.'
  };

  results.forEach(function(item) {
    Logger.log(item.role + ' : ' + item.status);
  });
  Logger.log('DASHBOARD : ' + menuResult.status);
  Logger.log('SCHOOL    : ' + schoolId);

  return result;
}
