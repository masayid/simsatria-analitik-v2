/** Resolver role user. */
function getCurrentRole_() {
  const email = getCurrentUser_();
  const user = findUserByEmail_(email);
  if (!user) throw new Error('Role user tidak ditemukan.');
  const role = clean_(user.role).toUpperCase();
  if (!Object.values(APP_CONFIG.ROLE).includes(role)) throw new Error('Role tidak valid: ' + role);
  return role;
}

function requireRole_(allowedRoles) {
  const role = getCurrentRole_();
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (allowed.map(r => clean_(r).toUpperCase()).indexOf(role) < 0) {
    throw new Error('Akses ditolak untuk role ' + role + '.');
  }
  return role;
}
