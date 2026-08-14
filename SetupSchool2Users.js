/**
 * SIM SATRIA — TAHAP 8.4
 * Register user sekolah kedua (SMANTI03PWJ).
 * Tidak menggunakan SETUP_CONFIG.SEKOLAH agar konfigurasi sekolah pertama tetap aman.
 */

const SCHOOL2_USERS = Object.freeze([
  { id_user: '04', nama: 'Guru Sekolah 2', email: 'kurikulum.sman3pwr@gmail.com', role: 'GURU' },
  { id_user: '05', nama: 'Wali Sekolah 2', email: 'wali03@gmail.com', role: 'WALI_KELAS' },
  { id_user: '06', nama: 'Karyawan Sekolah 2', email: 'karyawan03@gmail.com', role: 'KARYAWAN' },
  { id_user: '07', nama: 'Siswa Sekolah 2', email: 'siswa03@gmail.com', role: 'SISWA' }
]);

function setup25_registerSchool2Users() {
  requireSetupAccess_();
  const schoolId = 'SMANTI03PWJ';
  if (!findSchoolById_(schoolId)) throw new Error('Sekolah sekolah kedua belum terdaftar atau tidak ACTIVE: ' + schoolId);

  const results = SCHOOL2_USERS.map(function(user) {
    try {
      const result = registerUser({id_user:user.id_user,id_sekolah:schoolId,nama:user.nama,email:user.email,role:user.role});
      return {idUser:user.id_user,nama:user.nama,email:user.email,role:user.role,status:'REGISTERED',result:result};
    } catch (err) {
      return {idUser:user.id_user,nama:user.nama,email:user.email,role:user.role,status:'ERROR',message:err && err.message ? err.message : String(err)};
    }
  });
  Logger.log(JSON.stringify(results, null, 2));
  return ok_({idSekolah:schoolId,users:results},'Registrasi user sekolah kedua selesai.');
}

function normalizeUserIdForCheck_(value) {
  const text = clean_(value);
  if (/^\d+$/.test(text)) return String(Number(text));
  return text.toUpperCase();
}

function setup26_checkSchool2Users() {
  requireSetupAccess_();
  const schoolId = 'SMANTI03PWJ';
  const users = readSheetObjects_(getMasterSpreadsheet_(), MASTER.USER)
    .filter(function(row) { return clean_(row.id_sekolah).toUpperCase() === schoolId; })
    .map(function(row) {
      return {
        idUser: normalizeUserIdForCheck_(row.id_user),
        nama: clean_(row.nama),
        email: clean_(row.email).toLowerCase(),
        role: clean_(row.role).toUpperCase(),
        status: clean_(row.status).toUpperCase()
      };
    });

  const expected = [
    {idUser:'03',email:'masayid11@gmail.com',role:'ADMIN_SEKOLAH'},
    {idUser:'04',email:'kurikulum.sman3pwr@gmail.com',role:'GURU'},
    {idUser:'05',email:'wali03@gmail.com',role:'WALI_KELAS'},
    {idUser:'06',email:'karyawan03@gmail.com',role:'KARYAWAN'},
    {idUser:'07',email:'siswa03@gmail.com',role:'SISWA'}
  ];

  const checks = expected.map(function(item) {
    const expectedId = normalizeUserIdForCheck_(item.idUser);
    const found = users.find(function(user) {
      return user.idUser === expectedId && user.email === item.email && user.role === item.role && user.status === 'ACTIVE';
    });
    return {idUser:item.idUser,email:item.email,role:item.role,status:found?'PASS':'FAIL'};
  });

  const passed = checks.every(function(item) { return item.status === 'PASS'; });
  const result = {
    ok:passed,
    idSekolah:schoolId,
    totalUsers:users.length,
    checks:checks,
    users:users,
    message:passed ? 'Semua user sekolah kedua terdaftar ACTIVE dengan role dan sekolah yang benar.' : 'Masih ada user sekolah kedua yang belum sesuai.'
  };
  Logger.log(JSON.stringify(result,null,2));
  return result;
}
