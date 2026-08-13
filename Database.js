/** Database registry pusat untuk MASTER_*. */
const MASTER = Object.freeze({
  SEKOLAH: 'MASTER_SEKOLAH',
  USER: 'MASTER_USER',
  ROLE: 'MASTER_ROLE',
  PERMISSION: 'MASTER_PERMISSION',
  ROLE_PERMISSION: 'MASTER_ROLE_PERMISSION',
  MENU: 'MASTER_MENU'
});

const MASTER_HEADERS = Object.freeze({
  MASTER_SEKOLAH: ['id_sekolah','npsn','nama_sekolah','spreadsheet_id','drive_folder_id','status'],
  MASTER_USER: ['id_user','id_sekolah','nama','email','role','status'],
  MASTER_ROLE: ['id_role','kode_role','nama_role','keterangan','status'],
  MASTER_PERMISSION: ['id_permission','kode_permission','nama_permission','deskripsi'],
  MASTER_ROLE_PERMISSION: ['role','kode_menu','permission','aktif'],
  MASTER_MENU: ['kode_menu','nama_menu','parent_id','urutan','icon','aktif']
});

function getMasterSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty(APP_CONFIG.PROP.MASTER_SPREADSHEET_ID);
  if (!id) throw new Error('MASTER_SPREADSHEET_ID belum diset. Jalankan setMasterSpreadsheetId(spreadsheetId).');
  return SpreadsheetApp.openById(id);
}

function readSheetObjects_(ss, sheetName) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet ' + sheetName + ' tidak ditemukan.');
  const values = sh.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values.shift().map(clean_);
  return values
    .filter(row => row.some(value => clean_(value)))
    .map(row => Object.fromEntries(headers.map((header, i) => [header, row[i]])));
}

function findUserByEmail_(email) {
  const target = clean_(email).toLowerCase();
  return readSheetObjects_(getMasterSpreadsheet_(), MASTER.USER)
    .find(row => clean_(row.email).toLowerCase() === target) || null;
}

function findSchoolById_(id) {
  const target = clean_(id);
  return readSheetObjects_(getMasterSpreadsheet_(), MASTER.SEKOLAH)
    .find(row => clean_(row.id_sekolah) === target && clean_(row.status).toUpperCase() !== 'INACTIVE') || null;
}

function getPermissions_(role, menu) {
  const roleCode = clean_(role).toUpperCase();
  const menuCode = clean_(menu).toUpperCase();
  return readSheetObjects_(getMasterSpreadsheet_(), MASTER.ROLE_PERMISSION)
    .filter(row => clean_(row.role).toUpperCase() === roleCode)
    .filter(row => !menuCode || clean_(row.kode_menu).toUpperCase() === menuCode)
    .filter(row => clean_(row.aktif).toUpperCase() !== 'FALSE')
    .map(row => clean_(row.permission).toUpperCase());
}

function getMenusForRole_(role) {
  const roleCode = clean_(role).toUpperCase();
  const ss = getMasterSpreadsheet_();
  const menus = readSheetObjects_(ss, MASTER.MENU).filter(row => clean_(row.aktif).toUpperCase() !== 'FALSE');
  const permissions = readSheetObjects_(ss, MASTER.ROLE_PERMISSION)
    .filter(row => clean_(row.role).toUpperCase() === roleCode && clean_(row.aktif).toUpperCase() !== 'FALSE');
  const allowed = new Set(permissions.map(row => clean_(row.kode_menu).toUpperCase()));
  return menus.filter(row => allowed.has(clean_(row.kode_menu).toUpperCase()))
    .sort((a,b) => Number(a.urutan || 0) - Number(b.urutan || 0));
}

/** Jalankan sekali oleh owner setelah MASTER_SPREADSHEET_ID diset. */
function initializeMaster_() {
  const ss = getMasterSpreadsheet_();
  Object.keys(MASTER_HEADERS).forEach(sheetName => {
    let sh = ss.getSheetByName(sheetName);
    if (!sh) sh = ss.insertSheet(sheetName);
    const headers = MASTER_HEADERS[sheetName];
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  });
  seedMaster_(ss);
  return { spreadsheetId: ss.getId(), spreadsheetName: ss.getName() };
}

function seedMaster_(ss) {
  const roleSh = ss.getSheetByName(MASTER.ROLE);
  const permSh = ss.getSheetByName(MASTER.PERMISSION);
  const rpSh = ss.getSheetByName(MASTER.ROLE_PERMISSION);
  const menuSh = ss.getSheetByName(MASTER.MENU);

  if (roleSh.getLastRow() === 1) {
    roleSh.getRange(2,1,5,5).setValues([
      ['R01','ADMIN_SEKOLAH','Administrator Sekolah','Editor storage + seluruh operasi aplikasi','ACTIVE'],
      ['R02','GURU','Guru','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],
      ['R03','WALI_KELAS','Wali Kelas','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],
      ['R04','KARYAWAN','Karyawan','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],
      ['R05','SISWA','Siswa','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE']
    ]);
  }

  if (permSh.getLastRow() === 1) {
    permSh.getRange(2,1,5,4).setValues([
      ['P01','READ','Baca','Membaca data'],
      ['P02','INPUT','Input/Simpan','Menyimpan data'],
      ['P03','UPLOAD','Upload','Mengunggah file'],
      ['P04','PDF','PDF','Membuat PDF'],
      ['P05','ADMIN','Admin','Administrasi']
    ]);
  }

  if (menuSh.getLastRow() === 1) {
    menuSh.getRange(2,1,1,6).setValues([['DASHBOARD','Dashboard','',1,'home','TRUE']]);
  }

  if (rpSh.getLastRow() === 1) {
    const roles = Object.values(APP_CONFIG.ROLE);
    const perms = [APP_CONFIG.PERMISSION.READ, APP_CONFIG.PERMISSION.INPUT, APP_CONFIG.PERMISSION.UPLOAD, APP_CONFIG.PERMISSION.PDF];
    const rows = [];
    roles.forEach(role => perms.forEach(permission => rows.push([role,'DASHBOARD',permission,'TRUE'])));
    rows.push([APP_CONFIG.ROLE.ADMIN_SEKOLAH,'DASHBOARD',APP_CONFIG.PERMISSION.ADMIN,'TRUE']);
    rpSh.getRange(2,1,rows.length,4).setValues(rows);
  }
}
