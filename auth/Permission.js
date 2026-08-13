/**
 * Permission aplikasi dipisahkan dari permission Google Spreadsheet/Drive.
 * Viewer storage tetap dapat INPUT/UPLOAD/PDF apabila role memiliki permission aplikasi.
 */
function hasPermission_(permission, menu) {
  const role = getCurrentRole_();
  return getPermissions_(role, menu).indexOf(clean_(permission).toUpperCase()) >= 0;
}

function requirePermission_(permission, menu) {
  if (!hasPermission_(permission, menu)) {
    throw new Error('Tidak memiliki permission ' + permission + ' untuk menu ' + menu + '.');
  }
  return true;
}

function getCurrentPermissions(menu) {
  const role = getCurrentRole_();
  return ok_(getPermissions_(role, menu || ''));
}
