/** Database registry pusat untuk MASTER_* pada spreadsheet aplikasi. */
const MASTER = {
  SEKOLAH: 'MASTER_SEKOLAH', USER: 'MASTER_USER', ROLE: 'MASTER_ROLE',
  PERMISSION: 'MASTER_PERMISSION', ROLE_PERMISSION: 'MASTER_ROLE_PERMISSION', MENU: 'MASTER_MENU'
};

function getMasterSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('MASTER_SPREADSHEET_ID');
  if (!id) throw new Error('MASTER_SPREADSHEET_ID belum diset.');
  return SpreadsheetApp.openById(id);
}

function readSheetObjects_(ss, sheetName) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet ' + sheetName + ' tidak ditemukan.');
  const values = sh.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values.shift().map(clean_);
  return values.filter(r => r.some(v => clean_(v))).map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}

function findUserByEmail_(email) { return readSheetObjects_(getMasterSpreadsheet_(), MASTER.USER).find(r => clean_(r.email).toLowerCase() === clean_(email).toLowerCase()); }
function findSchoolById_(id) { return readSheetObjects_(getMasterSpreadsheet_(), MASTER.SEKOLAH).find(r => clean_(r.id_sekolah) === clean_(id)); }
function getPermissions_(role, menu) {
  return readSheetObjects_(getMasterSpreadsheet_(), MASTER.ROLE_PERMISSION)
    .filter(r => clean_(r.role).toUpperCase() === clean_(role).toUpperCase() && clean_(r.kode_menu) === clean_(menu) && String(r.aktif).toUpperCase() !== 'FALSE')
    .map(r => clean_(r.permission).toUpperCase());
}
