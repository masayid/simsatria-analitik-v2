/**
 * Resolver role user dari SESSION AUTH.
 *
 * Web App utama berjalan sebagai USER_ACCESSING.
 * Identitas Guru/Karyawan/Siswa dibaca dari getSessionContext()
 * -> Gateway -> USERS sekolah masing-masing.
 * ADMIN_SEKOLAH tetap berasal dari MASTER_USER melalui Gateway.
 */
function getCurrentRole_() {
  const session = getSessionContext();
  const data = session && session.ok === true ? session.data : session;
  const user = data && data.user ? data.user : null;

  if (!user) throw new Error('User sesi tidak ditemukan.');

  const role = clean_(user.role).toUpperCase();
  if (!role) throw new Error('Role user tidak ditemukan.');
  if (!Object.values(APP_CONFIG.ROLE).includes(role)) {
    throw new Error('Role tidak valid: ' + role);
  }
  return role;
}

function requireRole_(allowedRoles) {
  const role = getCurrentRole_();
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (allowed.map(function(r) { return clean_(r).toUpperCase(); }).indexOf(role) < 0) {
    throw new Error('Akses ditolak untuk role ' + role + '.');
  }
  return role;
}
