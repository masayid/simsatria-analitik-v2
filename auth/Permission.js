/**
 * Permission aplikasi dipisahkan dari permission Google Spreadsheet/Drive.
 * Runtime permission dibaca dari Auth Directory, bukan MASTER Spreadsheet.
 */
function hasPermission_(permission, menu) {
  const role = getCurrentRole_();
  return getRuntimePermissions_(role, menu).indexOf(clean_(permission).toUpperCase()) >= 0;
}

function requirePermission_(permission, menu) {
  if (!hasPermission_(permission, menu)) {
    throw new Error('Tidak memiliki permission ' + permission + ' untuk menu ' + menu + '.');
  }
  return true;
}

function getCurrentPermissions(menu) {
  const role = getCurrentRole_();
  return ok_(getRuntimePermissions_(role, menu || ''));
}
