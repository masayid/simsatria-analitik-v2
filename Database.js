/** Database registry pusat untuk MASTER_*. */
const MASTER = Object.freeze({
  SEKOLAH: 'MASTER_SEKOLAH', USER: 'MASTER_USER', ROLE: 'MASTER_ROLE',
  PERMISSION: 'MASTER_PERMISSION', ROLE_PERMISSION: 'MASTER_ROLE_PERMISSION', MENU: 'MASTER_MENU'
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

function setMasterSpreadsheetId(spreadsheetId) {
  requireValue_(spreadsheetId, 'MASTER_SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(clean_(spreadsheetId));
  PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP.MASTER_SPREADSHEET_ID, ss.getId());
  return ok_({spreadsheetId:ss.getId(), name:ss.getName()}, 'MASTER_SPREADSHEET_ID tersimpan.');
}

function initializeSystem() {
  const master = initializeMaster_();
  return ok_({version:APP_CONFIG.VERSION, master:master, roles:APP_CONFIG.ROLE, permissions:APP_CONFIG.PERMISSION}, 'Bootstrap SIM SATRIA selesai.');
}

function getSystemStatus() {
  const props = PropertiesService.getScriptProperties();
  const masterId = props.getProperty(APP_CONFIG.PROP.MASTER_SPREADSHEET_ID);
  let masterName = '';
  if (masterId) { try { masterName = SpreadsheetApp.openById(masterId).getName(); } catch(e) { masterName = 'TIDAK DAPAT DIAKSES'; } }
  return ok_({app:APP_CONFIG.NAME, version:APP_CONFIG.VERSION, masterSpreadsheetId:masterId || '', masterSpreadsheetName:masterName, gatewayConfigured:!!props.getProperty(APP_CONFIG.PROP.GATEWAY_URL)});
}

function readSheetObjects_(ss, sheetName) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet ' + sheetName + ' tidak ditemukan.');
  const values = sh.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values.shift().map(clean_);
  return values.filter(row => row.some(value => clean_(value))).map(row => Object.fromEntries(headers.map((header,i) => [header,row[i]])));
}

function findUserByEmail_(email) {
  const target = clean_(email).toLowerCase();
  return readSheetObjects_(getMasterSpreadsheet_(), MASTER.USER).find(row => clean_(row.email).toLowerCase() === target) || null;
}

function findSchoolById_(id) {
  const target = clean_(id);
  return readSheetObjects_(getMasterSpreadsheet_(), MASTER.SEKOLAH).find(row => clean_(row.id_sekolah) === target && clean_(row.status).toUpperCase() !== 'INACTIVE') || null;
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
  const permissions = readSheetObjects_(ss, MASTER.ROLE_PERMISSION).filter(row => clean_(row.role).toUpperCase() === roleCode && clean_(row.aktif).toUpperCase() !== 'FALSE');
  const readableMenus = new Set(permissions.filter(row => clean_(row.permission).toUpperCase() === APP_CONFIG.PERMISSION.READ).map(row => clean_(row.kode_menu).toUpperCase()));
  return menus.filter(row => readableMenus.has(clean_(row.kode_menu).toUpperCase())).sort((a,b) => Number(a.urutan || 0) - Number(b.urutan || 0));
}

function initializeMaster_() {
  const ss = getMasterSpreadsheet_();
  Object.keys(MASTER_HEADERS).forEach(sheetName => {
    let sh = ss.getSheetByName(sheetName);
    if (!sh) sh = ss.insertSheet(sheetName);
    const headers = MASTER_HEADERS[sheetName];
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  });
  seedMaster_(ss);
  return {spreadsheetId:ss.getId(), spreadsheetName:ss.getName()};
}

function seedMaster_(ss) {
  const roleSh=ss.getSheetByName(MASTER.ROLE), permSh=ss.getSheetByName(MASTER.PERMISSION), rpSh=ss.getSheetByName(MASTER.ROLE_PERMISSION), menuSh=ss.getSheetByName(MASTER.MENU);
  if (roleSh.getLastRow()===1) roleSh.getRange(2,1,5,5).setValues([
    ['R01','ADMIN_SEKOLAH','Administrator Sekolah','Editor storage + seluruh operasi aplikasi','ACTIVE'],['R02','GURU','Guru','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],['R03','WALI_KELAS','Wali Kelas','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],['R04','KARYAWAN','Karyawan','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],['R05','SISWA','Siswa','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE']
  ]);
  if (permSh.getLastRow()===1) permSh.getRange(2,1,5,4).setValues([
    ['P01','READ','Baca','Membaca data'],['P02','INPUT','Input/Simpan','Menyimpan data'],['P03','UPLOAD','Upload','Mengunggah file'],['P04','PDF','PDF','Membuat PDF'],['P05','ADMIN','Admin','Administrasi']
  ]);
  if (menuSh.getLastRow()===1) menuSh.getRange(2,1,1,6).setValues([['DASHBOARD','Dashboard','',1,'home','TRUE']]);
  if (rpSh.getLastRow()===1) {
    const roles=Object.values(APP_CONFIG.ROLE), perms=[APP_CONFIG.PERMISSION.READ,APP_CONFIG.PERMISSION.INPUT,APP_CONFIG.PERMISSION.UPLOAD,APP_CONFIG.PERMISSION.PDF], rows=[];
    roles.forEach(role=>perms.forEach(permission=>rows.push([role,'DASHBOARD',permission,'TRUE'])));
    rows.push([APP_CONFIG.ROLE.ADMIN_SEKOLAH,'DASHBOARD',APP_CONFIG.PERMISSION.ADMIN,'TRUE']);
    rpSh.getRange(2,1,rows.length,4).setValues(rows);
  }
}

/** Master administration: hanya owner/setup operator. */
function requireSetupAccess_() {
  const configured=PropertiesService.getScriptProperties().getProperty('SETUP_OWNER_EMAIL');
  const effective=Session.getEffectiveUser().getEmail().toLowerCase();
  if (configured && effective!==configured.toLowerCase()) throw new Error('Hanya SETUP_OWNER_EMAIL yang dapat mengubah MASTER.');
  return true;
}

function registerSchool(data) {
  requireSetupAccess_();
  requireValue_(data&&data.id_sekolah,'id_sekolah'); requireValue_(data&&data.npsn,'npsn'); requireValue_(data&&data.nama_sekolah,'nama_sekolah');
  requireValue_(data&&data.spreadsheet_id,'spreadsheet_id'); requireValue_(data&&data.drive_folder_id,'drive_folder_id');
  const ss=getMasterSpreadsheet_(), sh=ss.getSheetByName(MASTER.SEKOLAH), id=clean_(data.id_sekolah);
  if (readSheetObjects_(ss,MASTER.SEKOLAH).some(row=>clean_(row.id_sekolah)===id)) throw new Error('id_sekolah sudah terdaftar.');
  sh.appendRow([id,clean_(data.npsn),clean_(data.nama_sekolah),clean_(data.spreadsheet_id),clean_(data.drive_folder_id),'ACTIVE']);
  return ok_({idSekolah:id},'Sekolah berhasil didaftarkan.');
}

function registerUser(data) {
  requireSetupAccess_();
  requireValue_(data&&data.id_user,'id_user'); requireValue_(data&&data.id_sekolah,'id_sekolah'); requireValue_(data&&data.nama,'nama'); requireValue_(data&&data.email,'email'); requireValue_(data&&data.role,'role');
  const role=clean_(data.role).toUpperCase(), email=clean_(data.email).toLowerCase();
  if (!Object.values(APP_CONFIG.ROLE).includes(role)) throw new Error('Role tidak valid.');
  if (!findSchoolById_(data.id_sekolah)) throw new Error('Sekolah tidak ditemukan.');
  const ss=getMasterSpreadsheet_(), sh=ss.getSheetByName(MASTER.USER);
  if (readSheetObjects_(ss,MASTER.USER).some(row=>clean_(row.email).toLowerCase()===email)) throw new Error('Email user sudah terdaftar.');
  sh.appendRow([clean_(data.id_user),clean_(data.id_sekolah),clean_(data.nama),email,role,'ACTIVE']);
  return ok_({idUser:clean_(data.id_user),email:email},'User berhasil didaftarkan.');
}

function addMenu(menu) {
  requireSetupAccess_();
  requireValue_(menu&&menu.kode_menu,'kode_menu'); requireValue_(menu&&menu.nama_menu,'nama_menu');
  const ss=getMasterSpreadsheet_(), sh=ss.getSheetByName(MASTER.MENU), code=clean_(menu.kode_menu).toUpperCase();
  if (readSheetObjects_(ss,MASTER.MENU).some(row=>clean_(row.kode_menu).toUpperCase()===code)) throw new Error('Menu sudah terdaftar.');
  sh.appendRow([code,clean_(menu.nama_menu),clean_(menu.parent_id),Number(menu.urutan||99),clean_(menu.icon),'TRUE']);
  return ok_({kodeMenu:code},'Menu berhasil ditambahkan.');
}

function grantMenuPermission(role,menuCode,permissions) {
  requireSetupAccess_();
  const roleCode=clean_(role).toUpperCase(), menu=clean_(menuCode).toUpperCase(), list=Array.isArray(permissions)?permissions:[permissions];
  if (!Object.values(APP_CONFIG.ROLE).includes(roleCode)) throw new Error('Role tidak valid.');
  if (!menu) throw new Error('kode_menu wajib diisi.');
  const normalized=list.map(p=>clean_(p).toUpperCase());
  normalized.forEach(p=>{if(!Object.values(APP_CONFIG.PERMISSION).includes(p))throw new Error('Permission tidak valid: '+p);});
  const ss=getMasterSpreadsheet_(), sh=ss.getSheetByName(MASTER.ROLE_PERMISSION), existing=readSheetObjects_(ss,MASTER.ROLE_PERMISSION);
  normalized.forEach(permission=>{const exists=existing.some(row=>clean_(row.role).toUpperCase()===roleCode&&clean_(row.kode_menu).toUpperCase()===menu&&clean_(row.permission).toUpperCase()===permission);if(!exists)sh.appendRow([roleCode,menu,permission,'TRUE']);});
  return ok_({role:roleCode,menu:menu,permissions:normalized},'Permission menu berhasil diberikan.');
}
