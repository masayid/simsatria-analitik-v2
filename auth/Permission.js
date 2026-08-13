/**
 * Permission matrix aplikasi.
 * Viewer spreadsheet/Drive TIDAK berarti operasi INPUT/UPLOAD/PDF ditolak;
 * operasi aplikasi diperiksa terpisah di sini.
 */
function hasPermission_(permission, menu) {
  const role = getCurrentRole_();
  return getPermissions_(role, menu).indexOf(permission) >= 0;
}

function requirePermission_(permission, menu) {
  if (!hasPermission_(permission, menu)) throw new Error('Tidak memiliki permission ' + permission + ' untuk ' + menu + '.');
}
