/**
 * DATABASE / MASTER SERVICE
 *
 * MASTER_* berada pada satu Spreadsheet pusat.
 * MASTER_SEKOLAH menjadi directory sekolah.
 * Data akun Guru/Karyawan/Siswa TIDAK lagi disimpan di MASTER_USER.
 * Sumber akun adalah sheet USERS pada spreadsheet masing-masing sekolah.
 */
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
  if (!id) throw new Error('MASTER_SPREADSHEET_ID belum diset. Jalankan setMasterSpreadsheetId_() dari editor Apps Script.');
  return SpreadsheetApp.openById(id);
}

function setMasterSpreadsheetId_(spreadsheetId) {
  requireValue_(spreadsheetId, 'MASTER_SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(clean_(spreadsheetId));
  PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP.MASTER_SPREADSHEET_ID, ss.getId());
  return ok_({spreadsheetId:ss.getId(), name:ss.getName()}, 'MASTER_SPREADSHEET_ID tersimpan.');
}

function setSetupOwnerEmail_(email) {
  const value = clean_(email).toLowerCase();
  if (!value || !value.includes('@')) throw new Error('Email setup owner tidak valid.');
  const current = PropertiesService.getScriptProperties().getProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL);
  if (current) throw new Error('SETUP_OWNER_EMAIL sudah dikunci. Gunakan resetSetupOwnerEmail_() dari editor jika benar-benar diperlukan.');
  PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL, value);
  return ok_({email:value}, 'SETUP_OWNER_EMAIL tersimpan.');
}

function resetSetupOwnerEmail_() {
  PropertiesService.getScriptProperties().deleteProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL);
  return ok_(null, 'SETUP_OWNER_EMAIL dihapus. Set kembali sebelum aplikasi digunakan.');
}

function getSetupStatus() {
  const props = PropertiesService.getScriptProperties();
  const masterId = props.getProperty(APP_CONFIG.PROP.MASTER_SPREADSHEET_ID);
  const owner = props.getProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL);
  let masterName = '';
  if (masterId) {
    try { masterName = SpreadsheetApp.openById(masterId).getName(); }
    catch (e) { masterName = 'TIDAK DAPAT DIAKSES'; }
  }
  return ok_({
    masterSpreadsheetId: masterId || '',
    masterSpreadsheetName: masterName,
    setupOwnerEmail: owner || '',
    masterConfigured: !!masterId,
    setupOwnerConfigured: !!owner
  });
}

function initializeSystem_() {
  requireSetupAccess_();
  const master = initializeMaster_();
  return ok_({
    version: APP_CONFIG.VERSION,
    master: master,
    roles: APP_CONFIG.ROLE,
    permissions: APP_CONFIG.PERMISSION
  }, 'Bootstrap SIM SATRIA selesai.');
}

function getSystemStatus() {
  const props = PropertiesService.getScriptProperties();
  const masterId = props.getProperty(APP_CONFIG.PROP.MASTER_SPREADSHEET_ID);
  let masterName = '';
  if (masterId) {
    try { masterName = SpreadsheetApp.openById(masterId).getName(); }
    catch(e) { masterName = 'TIDAK DAPAT DIAKSES'; }
  }
  return ok_({
    app:APP_CONFIG.NAME,
    version:APP_CONFIG.VERSION,
    masterSpreadsheetId:masterId || '',
    masterSpreadsheetName:masterName,
    setupOwnerConfigured:!!props.getProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL),
    gatewayConfigured:!!props.getProperty(APP_CONFIG.PROP.GATEWAY_URL)
  });
}

function readSheetObjects_(ss, sheetName) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet ' + sheetName + ' tidak ditemukan.');
  const values = sh.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values.shift().map(clean_);
  return values
    .filter(row => row.some(value => clean_(value)))
    .map(row => Object.fromEntries(headers.map((header,i) => [header,row[i]])));
}

/**
 * Resolver akun aplikasi.
 * Sumber utama: USERS pada spreadsheet sekolah masing-masing.
 */
function findUserByEmail_(email) {
  return findUserByEmailFromSchoolUsers_(email);
}

function findSchoolById_(id) {
  const target = clean_(id);
  return readSheetObjects_(getMasterSpreadsheet_(), MASTER.SEKOLAH)
    .find(row => clean_(row.id_sekolah) === target && clean_(row.status).toUpperCase() !== APP_CONFIG.STATUS.INACTIVE) || null;
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
    .filter(row => clean_(row.role).toUpperCase() === roleCode)
    .filter(row => clean_(row.aktif).toUpperCase() !== 'FALSE');
  const readableMenus = new Set(permissions
    .filter(row => clean_(row.permission).toUpperCase() === APP_CONFIG.PERMISSION.READ)
    .map(row => clean_(row.kode_menu).toUpperCase()));
  return menus
    .filter(row => readableMenus.has(clean_(row.kode_menu).toUpperCase()))
    .sort((a,b) => Number(a.urutan || 0) - Number(b.urutan || 0));
}

function initializeMaster_() {
  const ss = getMasterSpreadsheet_();
  Object.keys(MASTER_HEADERS).forEach(sheetName => {
    let sh = ss.getSheetByName(sheetName);
    if (!sh) sh = ss.insertSheet(sheetName);
    const headers = MASTER_HEADERS[sheetName];
    const current = sh.getLastRow() === 0 ? [] : sh.getRange(1,1,1,Math.max(sh.getLastColumn(),headers.length)).getValues()[0];
    if (sh.getLastRow() === 0 || current.every(v => !clean_(v))) sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  });
  seedMaster_(ss);
  return {spreadsheetId:ss.getId(), spreadsheetName:ss.getName()};
}

function seedMaster_(ss) {
  const roleSh=ss.getSheetByName(MASTER.ROLE);
  const permSh=ss.getSheetByName(MASTER.PERMISSION);
  const rpSh=ss.getSheetByName(MASTER.ROLE_PERMISSION);
  const menuSh=ss.getSheetByName(MASTER.MENU);

  if (roleSh.getLastRow()===1) roleSh.getRange(2,1,5,5).setValues([
    ['R01','ADMIN_SEKOLAH','Administrator Sekolah','Editor storage + seluruh operasi aplikasi','ACTIVE'],
    ['R02','GURU','Guru','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],
    ['R03','WALI_KELAS','Wali Kelas','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],
    ['R04','KARYAWAN','Karyawan','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],
    ['R05','SISWA','Siswa','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE']
  ]);
  if (permSh.getLastRow()===1) permSh.getRange(2,1,5,4).setValues([
    ['P01','READ','Baca','Membaca data'],['P02','INPUT','Input/Simpan','Menyimpan data'],['P03','UPLOAD','Upload','Mengunggah file'],['P04','PDF','PDF','Membuat PDF'],['P05','ADMIN','Admin','Administrasi']
  ]);
  if (menuSh.getLastRow()===1) menuSh.getRange(2,1,1,6).setValues([['DASHBOARD','Dashboard','',1,'home','TRUE']]);
  if (rpSh.getLastRow()===1) {
    const roles=Object.values(APP_CONFIG.ROLE);
    const perms=[APP_CONFIG.PERMISSION.READ,APP_CONFIG.PERMISSION.INPUT,APP_CONFIG.PERMISSION.UPLOAD,APP_CONFIG.PERMISSION.PDF];
    const rows=[];
    roles.forEach(role=>perms.forEach(permission=>rows.push([role,'DASHBOARD',permission,'TRUE'])));
    rows.push([APP_CONFIG.ROLE.ADMIN_SEKOLAH,'DASHBOARD',APP_CONFIG.PERMISSION.ADMIN,'TRUE']);
    rpSh.getRange(2,1,rows.length,4).setValues(rows);
  }
}

function requireSetupAccess_() {
  const configured=PropertiesService.getScriptProperties().getProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL);
  if (!configured) throw new Error('SETUP_OWNER_EMAIL belum dikonfigurasi. Jalankan setSetupOwnerEmail_() dari editor Apps Script.');
  const active=clean_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!active || active!==configured.toLowerCase()) throw new Error('Akses MASTER hanya untuk SETUP_OWNER_EMAIL.');
  return true;
}

function registerSchool(data) {
  requireSetupAccess_();
  validateSchoolPayload_(data);
  const ss=getMasterSpreadsheet_();
  const sh=ss.getSheetByName(MASTER.SEKOLAH);
  const id=clean_(data.id_sekolah).toUpperCase();
  const rows=readSheetObjects_(ss,MASTER.SEKOLAH);
  if (rows.some(row=>clean_(row.id_sekolah).toUpperCase()===id)) throw new Error('id_sekolah sudah terdaftar: '+id);

  const schoolSs=SpreadsheetApp.openById(clean_(data.spreadsheet_id));
  const folder=DriveApp.getFolderById(clean_(data.drive_folder_id));
  if (!schoolSs.getId() || !folder.getId()) throw new Error('Storage sekolah tidak valid.');

  sh.appendRow([id,clean_(data.npsn),clean_(data.nama_sekolah),schoolSs.getId(),folder.getId(),APP_CONFIG.STATUS.ACTIVE]);
  return ok_({idSekolah:id,npsn:clean_(data.npsn),namaSekolah:clean_(data.nama_sekolah),spreadsheetId:schoolSs.getId(),driveFolderId:folder.getId()},'Sekolah berhasil didaftarkan.');
}

function validateSchoolPayload_(data) {
  requireValue_(data&&data.id_sekolah,'id_sekolah');
  requireValue_(data&&data.npsn,'npsn');
  requireValue_(data&&data.nama_sekolah,'nama_sekolah');
  requireValue_(data&&data.spreadsheet_id,'spreadsheet_id');
  requireValue_(data&&data.drive_folder_id,'drive_folder_id');
  if (!/^[A-Za-z0-9_-]{3,50}$/.test(clean_(data.id_sekolah))) throw new Error('id_sekolah hanya boleh berisi huruf, angka, _ atau -.');
  if (!/^\d{8}$/.test(clean_(data.npsn))) throw new Error('NPSN harus 8 digit.');
}

function updateSchoolStatus(idSekolah,status) {
  requireSetupAccess_();
  const value=clean_(status).toUpperCase();
  if (![APP_CONFIG.STATUS.ACTIVE,APP_CONFIG.STATUS.INACTIVE].includes(value)) throw new Error('Status sekolah tidak valid.');
  const ss=getMasterSpreadsheet_(), sh=ss.getSheetByName(MASTER.SEKOLAH), values=sh.getDataRange().getValues();
  const col=values[0].map(clean_).indexOf('id_sekolah'), statusCol=values[0].map(clean_).indexOf('status');
  if (col<0||statusCol<0) throw new Error('Header MASTER_SEKOLAH tidak lengkap.');
  for(let r=1;r<values.length;r++) {
    if(clean_(values[r][col]).toUpperCase()===clean_(idSekolah).toUpperCase()) {
      sh.getRange(r+1,statusCol+1).setValue(value);
      return ok_({idSekolah:clean_(idSekolah),status:value},'Status sekolah diperbarui.');
    }
  }
  throw new Error('Sekolah tidak ditemukan.');
}

/**
 * MASTER_USER dipertahankan hanya sebagai struktur kompatibilitas.
 * Akun baru harus dibuat pada sheet USERS sekolah terkait.
 */
function registerUser(data) {
  requireSetupAccess_();
  throw new Error('MASTER_USER bukan sumber user. Tambahkan Guru/Karyawan/Siswa pada sheet USERS di spreadsheet sekolah masing-masing.');
}

function updateUserStatus(email,status) {
  requireSetupAccess_();
  throw new Error('MASTER_USER bukan sumber user. Ubah status user pada sheet USERS di spreadsheet sekolah masing-masing.');
}

function addMenu(menu) {
  requireSetupAccess_();
  requireValue_(menu&&menu.kode_menu,'kode_menu'); requireValue_(menu&&menu.nama_menu,'nama_menu');
  const ss=getMasterSpreadsheet_(), sh=ss.getSheetByName(MASTER.MENU), code=clean_(menu.kode_menu).toUpperCase();
  if (readSheetObjects_(ss,MASTER.MENU).some(row=>clean_(row.kode_menu).toUpperCase()===code)) throw new Error('Menu sudah terdaftar.');
  sh.appendRow([code,clean_(menu.nama_menu),clean_(menu.parent_id),Number(menu.urutan||99),clean_(menu.icon),'TRUE']);
  return ok_({kodeMenu:code},'Menu berhasil ditambahkan.');
}

function setMenuStatus(menuCode,aktif) {
  requireSetupAccess_();
  const ss=getMasterSpreadsheet_(), sh=ss.getSheetByName(MASTER.MENU), values=sh.getDataRange().getValues();
  const codeCol=values[0].map(clean_).indexOf('kode_menu'), activeCol=values[0].map(clean_).indexOf('aktif');
  if(codeCol<0||activeCol<0) throw new Error('Header MASTER_MENU tidak lengkap.');
  const target=clean_(menuCode).toUpperCase();
  for(let r=1;r<values.length;r++) {
    if(clean_(values[r][codeCol]).toUpperCase()===target) {
      sh.getRange(r+1,activeCol+1).setValue(aktif ? 'TRUE' : 'FALSE');
      return ok_({kodeMenu:target,aktif:!!aktif},'Status menu diperbarui.');
    }
  }
  throw new Error('Menu tidak ditemukan.');
}

function grantMenuPermission(role,menuCode,permissions) {
  requireSetupAccess_();
  const roleCode=clean_(role).toUpperCase(), menu=clean_(menuCode).toUpperCase();
  if (!Object.values(APP_CONFIG.ROLE).includes(roleCode)) throw new Error('Role tidak valid.');
  if (!menu) throw new Error('kode_menu wajib diisi.');
  if (!readSheetObjects_(getMasterSpreadsheet_(),MASTER.MENU).some(row=>clean_(row.kode_menu).toUpperCase()===menu)) throw new Error('Menu belum terdaftar: '+menu);
  const list=Array.isArray(permissions)?permissions:[permissions], normalized=list.map(p=>clean_(p).toUpperCase());
  normalized.forEach(p=>{if(!Object.values(APP_CONFIG.PERMISSION).includes(p))throw new Error('Permission tidak valid: '+p);});
  const ss=getMasterSpreadsheet_(), sh=ss.getSheetByName(MASTER.ROLE_PERMISSION), existing=readSheetObjects_(ss,MASTER.ROLE_PERMISSION);
  normalized.forEach(permission=>{const exists=existing.some(row=>clean_(row.role).toUpperCase()===roleCode&&clean_(row.kode_menu).toUpperCase()===menu&&clean_(row.permission).toUpperCase()===permission);if(!exists)sh.appendRow([roleCode,menu,permission,'TRUE']);});
  return ok_({role:roleCode,menu:menu,permissions:normalized},'Permission menu berhasil diberikan.');
}

function revokeMenuPermission(role,menuCode,permissions) {
  requireSetupAccess_();
  const roleCode=clean_(role).toUpperCase(), menu=clean_(menuCode).toUpperCase();
  const list=Array.isArray(permissions)?permissions:[permissions], normalized=new Set(list.map(p=>clean_(p).toUpperCase()));
  const ss=getMasterSpreadsheet_(), sh=ss.getSheetByName(MASTER.ROLE_PERMISSION), values=sh.getDataRange().getValues();
  const headers=values.shift().map(clean_), roleCol=headers.indexOf('role'), menuCol=headers.indexOf('kode_menu'), permCol=headers.indexOf('permission');
  if(roleCol<0||menuCol<0||permCol<0)throw new Error('Header MASTER_ROLE_PERMISSION tidak lengkap.');
  for(let r=values.length-1;r>=0;r--) {
    if(clean_(values[r][roleCol]).toUpperCase()===roleCode&&clean_(values[r][menuCol]).toUpperCase()===menu&&normalized.has(clean_(values[r][permCol]).toUpperCase())) sh.deleteRow(r+2);
  }
  return ok_({role:roleCode,menu:menu,permissions:Array.from(normalized)},'Permission menu dicabut.');
}

function listMasterSchools() {
  requireSetupAccess_();
  return ok_(readSheetObjects_(getMasterSpreadsheet_(),MASTER.SEKOLAH));
}

/**
 * MASTER_USER kini hanya tampilan gabungan USERS seluruh sekolah ACTIVE.
 * Tidak ada data yang ditulis ke MASTER_USER.
 */
function listMasterUsers(idSekolah) {
  requireSetupAccess_();
  let rows = getAllSchoolUsers_();
  const target = clean_(idSekolah).toUpperCase();
  if (target) rows = rows.filter(function(row) {
    return clean_(row.id_sekolah).toUpperCase() === target;
  });
  return ok_(rows);
}

function listMasterMenus() { requireSetupAccess_(); return ok_(readSheetObjects_(getMasterSpreadsheet_(),MASTER.MENU)); }
function listRolePermissions(role) {
  requireSetupAccess_(); const rows=readSheetObjects_(getMasterSpreadsheet_(),MASTER.ROLE_PERMISSION), target=clean_(role).toUpperCase();
  return ok_(target ? rows.filter(row=>clean_(row.role).toUpperCase()===target) : rows);
}

function getMasterSummary() {
  requireSetupAccess_();
  const ss=getMasterSpreadsheet_(), count=name=>readSheetObjects_(ss,name).length;
  const userCount = getAllSchoolUsers_().length;
  return ok_({spreadsheetId:ss.getId(),spreadsheetName:ss.getName(),sekolah:count(MASTER.SEKOLAH),user:userCount,role:count(MASTER.ROLE),permission:count(MASTER.PERMISSION),rolePermission:count(MASTER.ROLE_PERMISSION),menu:count(MASTER.MENU)});
}
