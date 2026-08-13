/**
 * DATABASE / MASTER SERVICE
 *
 * Tahap 5: konfigurasi MASTER secara operasional.
 * Semua MASTER_* berada pada satu Spreadsheet pusat.
 * Data sekolah dan user dipisahkan dengan id_sekolah.
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
  if (!id) throw new Error('MASTER_SPREADSHEET_ID belum diset. Jalankan setMasterSpreadsheetId(spreadsheetId) dari editor Apps Script.');
  return SpreadsheetApp.openById(id);
}

/** Simpan Spreadsheet MASTER pusat. Jalankan manual oleh owner/setup operator. */
function setMasterSpreadsheetId(spreadsheetId) {
  requireValue_(spreadsheetId, 'MASTER_SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(clean_(spreadsheetId));
  PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP.MASTER_SPREADSHEET_ID, ss.getId());
  return ok_({spreadsheetId:ss.getId(), name:ss.getName()}, 'MASTER_SPREADSHEET_ID tersimpan.');
}

/**
 * Tetapkan akun setup owner.
 * Jalankan dari editor Apps Script sebelum aplikasi dipakai publik.
 */
function setSetupOwnerEmail(email) {
  const value = clean_(email).toLowerCase();
  if (!value || !value.includes('@')) throw new Error('Email setup owner tidak valid.');
  const current = PropertiesService.getScriptProperties().getProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL);
  if (current) throw new Error('SETUP_OWNER_EMAIL sudah dikunci. Gunakan resetSetupOwnerEmail() dari editor jika benar-benar diperlukan.');
  PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL, value);
  return ok_({email:value}, 'SETUP_OWNER_EMAIL tersimpan.');
}

/** Reset manual hanya dari editor Apps Script. */
function resetSetupOwnerEmail() {
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

function initializeSystem() {
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

function findUserByEmail_(email) {
  const target = clean_(email).toLowerCase();
  return readSheetObjects_(getMasterSpreadsheet_(), MASTER.USER)
    .find(row => clean_(row.email).toLowerCase() === target) || null;
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
  const menus = readSheetObjects_(ss, MASTER.MENU)
    .filter(row => clean_(row.aktif).toUpperCase() !== 'FALSE');
  const permissions = readSheetObjects_(ss, MASTER.ROLE_PERMISSION)
    .filter(row => clean_(row.role).toUpperCase() === roleCode)
    .filter(row => clean_(row.aktif).toUpperCase() !== 'FALSE');
  const readableMenus = new Set(
    permissions
      .filter(row => clean_(row.permission).toUpperCase() === APP_CONFIG.PERMISSION.READ)
      .map(row => clean_(row.kode_menu).toUpperCase())
  );
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
    if (sh.getLastRow() === 0 || current.every(v => !clean_(v))) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
    }
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
    ['P01','READ','Baca','Membaca data'],
    ['P02','INPUT','Input/Simpan','Menyimpan data'],
    ['P03','UPLOAD','Upload','Mengunggah file'],
    ['P04','PDF','PDF','Membuat PDF'],
    ['P05','ADMIN','Admin','Administrasi']
  ]);

  if (menuSh.getLastRow()===1) menuSh.getRange(2,1,1,6).setValues([
    ['DASHBOARD','Dashboard','',1,'home','TRUE']
  ]);

  if (rpSh.getLastRow()===1) {
    const roles=Object.values(APP_CONFIG.ROLE);
    const perms=[APP_CONFIG.PERMISSION.READ,APP_CONFIG.PERMISSION.INPUT,APP_CONFIG.PERMISSION.UPLOAD,APP_CONFIG.PERMISSION.PDF];
    const rows=[];
    roles.forEach(role=>perms.forEach(permission=>rows.push([role,'DASHBOARD',permission,'TRUE'])));
    rows.push([APP_CONFIG.ROLE.ADMIN_SEKOLAH,'DASHBOARD',APP_CONFIG.PERMISSION.ADMIN,'TRUE']);
    rpSh.getRange(2,1,rows.length,4).setValues(rows);
  }
}

/** Hanya SETUP_OWNER_EMAIL yang boleh mengubah MASTER. */
function requireSetupAccess_() {
  const configured=PropertiesService.getScriptProperties().getProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL);
  if (!configured) throw new Error('SETUP_OWNER_EMAIL belum dikonfigurasi. Jalankan setSetupOwnerEmail(email) dari editor Apps Script.');
  const effective=clean_(Session.getEffectiveUser().getEmail()).toLowerCase();
  if (!effective || effective!==configured.toLowerCase()) throw new Error('Akses MASTER hanya untuk SETUP_OWNER_EMAIL.');
  return true;
}

/**
 * Registrasi sekolah baru.
 * Sekaligus memvalidasi bahwa Spreadsheet dan Folder Drive dapat diakses.
 */
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

  sh.appendRow([
    id,
    clean_(data.npsn),
    clean_(data.nama_sekolah),
    schoolSs.getId(),
    folder.getId(),
    APP_CONFIG.STATUS.ACTIVE
  ]);
  return ok_({
    idSekolah:id,
    npsn:clean_(data.npsn),
    namaSekolah:clean_(data.nama_sekolah),
    spreadsheetId:schoolSs.getId(),
    driveFolderId:folder.getId()
  },'Sekolah berhasil didaftarkan.');
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
  const ss=getMasterSpreadsheet_();
  const sh=ss.getSheetByName(MASTER.SEKOLAH);
  const values=sh.getDataRange().getValues();
  const col=values[0].map(clean_).indexOf('id_sekolah');
  const statusCol=values[0].map(clean_).indexOf('status');
  if (col<0||statusCol<0) throw new Error('Header MASTER_SEKOLAH tidak lengkap.');
  for(let r=1;r<values.length;r++) {
    if(clean_(values[r][col]).toUpperCase()===clean_(idSekolah).toUpperCase()) {
      sh.getRange(r+1,statusCol+1).setValue(value);
      return ok_({idSekolah:clean_(idSekolah),status:value},'Status sekolah diperbarui.');
    }
  }
  throw new Error('Sekolah tidak ditemukan.');
}

function registerUser(data) {
  requireSetupAccess_();
  requireValue_(data&&data.id_user,'id_user');
  requireValue_(data&&data.id_sekolah,'id_sekolah');
  requireValue_(data&&data.nama,'nama');
  requireValue_(data&&data.email,'email');
  requireValue_(data&&data.role,'role');

  const role=clean_(data.role).toUpperCase();
  const email=clean_(data.email).toLowerCase();
  if (!Object.values(APP_CONFIG.ROLE).includes(role)) throw new Error('Role tidak valid: '+role);
  if (!findSchoolById_(data.id_sekolah)) throw new Error('Sekolah tidak ditemukan atau tidak ACTIVE.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Format email tidak valid.');

  const ss=getMasterSpreadsheet_();
  const sh=ss.getSheetByName(MASTER.USER);
  const rows=readSheetObjects_(ss,MASTER.USER);
  if (rows.some(row=>clean_(row.email).toLowerCase()===email)) throw new Error('Email user sudah terdaftar.');
  if (rows.some(row=>clean_(row.id_user).toUpperCase()===clean_(data.id_user).toUpperCase())) throw new Error('id_user sudah terdaftar.');

  sh.appendRow([clean_(data.id_user),clean_(data.id_sekolah).toUpperCase(),clean_(data.nama),email,role,APP_CONFIG.STATUS.ACTIVE]);
  return ok_({idUser:clean_(data.id_user),email:email,role:role,idSekolah:clean_(data.id_sekolah).toUpperCase()},'User berhasil didaftarkan.');
}

function updateUserStatus(email,status) {
  requireSetupAccess_();
  const value=clean_(status).toUpperCase();
  if (![APP_CONFIG.STATUS.ACTIVE,APP_CONFIG.STATUS.INACTIVE].includes(value)) throw new Error('Status user tidak valid.');
  const ss=getMasterSpreadsheet_();
  const sh=ss.getSheetByName(MASTER.USER);
  const values=sh.getDataRange().getValues();
  const emailCol=values[0].map(clean_).indexOf('email');
  const statusCol=values[0].map(clean_).indexOf('status');
  if(emailCol<0||statusCol<0) throw new Error('Header MASTER_USER tidak lengkap.');
  for(let r=1;r<values.length;r++) {
    if(clean_(values[r][emailCol]).toLowerCase()===clean_(email).toLowerCase()) {
      sh.getRange(r+1,statusCol+1).setValue(value);
      return ok_({email:clean_(email).toLowerCase(),status:value},'Status user diperbarui.');
    }
  }
  throw new Error('User tidak ditemukan.');
}

function addMenu(menu) {
  requireSetupAccess_();
  requireValue_(menu&&menu.kode_menu,'kode_menu');
  requireValue_(menu&&menu.nama_menu,'nama_menu');
  const ss=getMasterSpreadsheet_();
  const sh=ss.getSheetByName(MASTER.MENU);
  const code=clean_(menu.kode_menu).toUpperCase();
  if (readSheetObjects_(ss,MASTER.MENU).some(row=>clean_(row.kode_menu).toUpperCase()===code)) throw new Error('Menu sudah terdaftar.');
  sh.appendRow([code,clean_(menu.nama_menu),clean_(menu.parent_id),Number(menu.urutan||99),clean_(menu.icon),'TRUE']);
  return ok_({kodeMenu:code},'Menu berhasil ditambahkan.');
}

function setMenuStatus(menuCode,aktif) {
  requireSetupAccess_();
  const ss=getMasterSpreadsheet_();
  const sh=ss.getSheetByName(MASTER.MENU);
  const values=sh.getDataRange().getValues();
  const codeCol=values[0].map(clean_).indexOf('kode_menu');
  const activeCol=values[0].map(clean_).indexOf('aktif');
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
  const roleCode=clean_(role).toUpperCase();
  const menu=clean_(menuCode).toUpperCase();
  if (!Object.values(APP_CONFIG.ROLE).includes(roleCode)) throw new Error('Role tidak valid.');
  if (!menu) throw new Error('kode_menu wajib diisi.');
  if (!readSheetObjects_(getMasterSpreadsheet_(),MASTER.MENU).some(row=>clean_(row.kode_menu).toUpperCase()===menu)) throw new Error('Menu belum terdaftar: '+menu);

  const list=Array.isArray(permissions)?permissions:[permissions];
  const normalized=list.map(p=>clean_(p).toUpperCase());
  normalized.forEach(p=>{if(!Object.values(APP_CONFIG.PERMISSION).includes(p))throw new Error('Permission tidak valid: '+p);});

  const ss=getMasterSpreadsheet_();
  const sh=ss.getSheetByName(MASTER.ROLE_PERMISSION);
  const existing=readSheetObjects_(ss,MASTER.ROLE_PERMISSION);
  normalized.forEach(permission=>{
    const exists=existing.some(row=>clean_(row.role).toUpperCase()===roleCode&&clean_(row.kode_menu).toUpperCase()===menu&&clean_(row.permission).toUpperCase()===permission);
    if(!exists)sh.appendRow([roleCode,menu,permission,'TRUE']);
  });
  return ok_({role:roleCode,menu:menu,permissions:normalized},'Permission menu berhasil diberikan.');
}

function revokeMenuPermission(role,menuCode,permissions) {
  requireSetupAccess_();
  const roleCode=clean_(role).toUpperCase();
  const menu=clean_(menuCode).toUpperCase();
  const list=Array.isArray(permissions)?permissions:[permissions];
  const normalized=new Set(list.map(p=>clean_(p).toUpperCase()));
  const ss=getMasterSpreadsheet_();
  const sh=ss.getSheetByName(MASTER.ROLE_PERMISSION);
  const values=sh.getDataRange().getValues();
  const headers=values.shift().map(clean_);
  const roleCol=headers.indexOf('role'), menuCol=headers.indexOf('kode_menu'), permCol=headers.indexOf('permission');
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

function listMasterUsers(idSekolah) {
  requireSetupAccess_();
  const rows=readSheetObjects_(getMasterSpreadsheet_(),MASTER.USER);
  const target=clean_(idSekolah).toUpperCase();
  return ok_(target ? rows.filter(row=>clean_(row.id_sekolah).toUpperCase()===target) : rows);
}

function listMasterMenus() {
  requireSetupAccess_();
  return ok_(readSheetObjects_(getMasterSpreadsheet_(),MASTER.MENU));
}

function listRolePermissions(role) {
  requireSetupAccess_();
  const rows=readSheetObjects_(getMasterSpreadsheet_(),MASTER.ROLE_PERMISSION);
  const target=clean_(role).toUpperCase();
  return ok_(target ? rows.filter(row=>clean_(row.role).toUpperCase()===target) : rows);
}

/** Ringkasan operasional MASTER untuk halaman admin/setup. */
function getMasterSummary() {
  requireSetupAccess_();
  const ss=getMasterSpreadsheet_();
  const count=name=>readSheetObjects_(ss,name).length;
  return ok_({
    spreadsheetId:ss.getId(),
    spreadsheetName:ss.getName(),
    sekolah:count(MASTER.SEKOLAH),
    user:count(MASTER.USER),
    role:count(MASTER.ROLE),
    permission:count(MASTER.PERMISSION),
    rolePermission:count(MASTER.ROLE_PERMISSION),
    menu:count(MASTER.MENU)
  });
}
