/**
 * SIM SATRIA Multi Sekolah — TAHAP 8.3
 * Registrasi user sekolah kedua.
 *
 * File ini sengaja terpisah dari Setup.js agar konfigurasi sekolah pertama
 * tidak tertimpa saat onboarding sekolah baru.
 */

const SCHOOL2_USER_SETUP = Object.freeze({
  id_sekolah: 'SMANTI03PWJ',
  admin: {
    id_user: '03',
    nama: 'Masayid11',
    email: 'masayid11@gmail.com',
    role: 'ADMIN_SEKOLAH'
  }
});

/**
 * TAHAP 8.3 — Register ADMIN_SEKOLAH untuk sekolah kedua.
 * Jalankan sebagai SETUP_OWNER dari Apps Script Editor.
 */
function setup23_registerSchool2Admin() {
  const u = SCHOOL2_USER_SETUP.admin;

  requireSetupValue_(SCHOOL2_USER_SETUP.id_sekolah, 'SCHOOL2_USER_SETUP.id_sekolah');
  requireSetupValue_(u.id_user, 'SCHOOL2_USER_SETUP.admin.id_user');
  requireSetupValue_(u.nama, 'SCHOOL2_USER_SETUP.admin.nama');
  requireSetupValue_(u.email, 'SCHOOL2_USER_SETUP.admin.email');

  const result = registerUser({
    id_user: u.id_user,
    id_sekolah: SCHOOL2_USER_SETUP.id_sekolah,
    nama: u.nama,
    email: u.email,
    role: u.role
  });

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Verifikasi ADMIN sekolah kedua setelah registrasi.
 */
function setup24_checkSchool2Admin() {
  const email = SCHOOL2_USER_SETUP.admin.email.toLowerCase();
  const user = findUserByEmail_(email);

  if (!user) {
    throw new Error('ADMIN sekolah kedua belum ditemukan: ' + email);
  }

  const expectedSchool = SCHOOL2_USER_SETUP.id_sekolah.toUpperCase();
  const actualSchool = clean_(user.id_sekolah).toUpperCase();
  const actualRole = clean_(user.role).toUpperCase();
  const actualStatus = clean_(user.status).toUpperCase();

  const valid =
    actualSchool === expectedSchool &&
    actualRole === 'ADMIN_SEKOLAH' &&
    actualStatus === APP_CONFIG.STATUS.ACTIVE;

  const result = {
    ok: valid,
    idUser: user.id_user,
    nama: user.nama,
    email: user.email,
    idSekolah: actualSchool,
    role: actualRole,
    status: actualStatus
  };

  Logger.log(JSON.stringify(result, null, 2));

  if (!valid) {
    throw new Error(
      'Verifikasi ADMIN sekolah kedua gagal. ' +
      'Pastikan id_sekolah, role, dan status sesuai.'
    );
  }

  return ok_(result, 'ADMIN_SEKOLAH sekolah kedua terverifikasi.');
}
