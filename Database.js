/** Database registry pusat untuk MASTER_*. */
const MASTER = { SEKOLAH:'MASTER_SEKOLAH', USER:'MASTER_USER', ROLE:'MASTER_ROLE', PERMISSION:'MASTER_PERMISSION', ROLE_PERMISSION:'MASTER_ROLE_PERMISSION', MENU:'MASTER_MENU' };

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
  return values.filter(r=>r.some(v=>clean_(v))).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}

function findUserByEmail_(email) { return readSheetObjects_(getMasterSpreadsheet_(),MASTER.USER).find(r=>clean_(r.email).toLowerCase()===clean_(email).toLowerCase()); }
function findSchoolById_(id) { return readSheetObjects_(getMasterSpreadsheet_(),MASTER.SEKOLAH).find(r=>clean_(r.id_sekolah)===clean_(id)); }
function getPermissions_(role,menu) { return readSheetObjects_(getMasterSpreadsheet_(),MASTER.ROLE_PERMISSION).filter(r=>clean_(r.role).toUpperCase()===clean_(role).toUpperCase()&&clean_(r.kode_menu)===clean_(menu)&&String(r.aktif).toUpperCase()!=='FALSE').map(r=>clean_(r.permission).toUpperCase()); }

/** Jalankan sekali oleh owner untuk membuat struktur MASTER dan permission awal. */
function initializeMaster_() {
  const ss=getMasterSpreadsheet_();
  const defs={
    MASTER_SEKOLAH:['id_sekolah','npsn','nama_sekolah','spreadsheet_id','drive_folder_id','status'],
    MASTER_USER:['id_user','id_sekolah','nama','email','role','status'],
    MASTER_ROLE:['id_role','kode_role','nama_role','keterangan','status'],
    MASTER_PERMISSION:['id_permission','kode_permission','nama_permission','deskripsi'],
    MASTER_ROLE_PERMISSION:['role','kode_menu','permission','aktif'],
    MASTER_MENU:['kode_menu','nama_menu','parent_id','urutan','icon','aktif']
  };
  Object.keys(defs).forEach(name=>{let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getLastRow()===0)sh.getRange(1,1,1,defs[name].length).setValues([defs[name]]);});
  seedMaster_(ss);
  return ok_({spreadsheetId:ss.getId()},'MASTER siap digunakan.');
}

function seedMaster_(ss) {
  const roleSh=ss.getSheetByName(MASTER.ROLE), permSh=ss.getSheetByName(MASTER.PERMISSION), rpSh=ss.getSheetByName(MASTER.ROLE_PERMISSION), menuSh=ss.getSheetByName(MASTER.MENU);
  if(roleSh.getLastRow()===1) roleSh.getRange(2,1,5,5).setValues([
    ['R01','ADMIN_SEKOLAH','Administrator Sekolah','Editor storage + seluruh operasi aplikasi','ACTIVE'],['R02','GURU','Guru','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],['R03','WALI_KELAS','Wali Kelas','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],['R04','KARYAWAN','Karyawan','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE'],['R05','SISWA','Siswa','Viewer storage + INPUT/UPLOAD/PDF','ACTIVE']
  ]);
  if(permSh.getLastRow()===1) permSh.getRange(2,1,5,4).setValues([['P01','READ','Baca','Membaca data'],['P02','INPUT','Input/Simpan','Menyimpan data'],['P03','UPLOAD','Upload','Mengunggah file'],['P04','PDF','PDF','Membuat PDF'],['P05','ADMIN','Admin','Administrasi']]);
  if(menuSh.getLastRow()===1) menuSh.getRange(2,1,1,6).setValues([['DASHBOARD','Dashboard','',1,'home','TRUE']]);
  if(rpSh.getLastRow()===1){const roles=['ADMIN_SEKOLAH','GURU','WALI_KELAS','KARYAWAN','SISWA'];const perms=['READ','INPUT','UPLOAD','PDF'];const rows=[];roles.forEach(r=>perms.forEach(p=>rows.push([r,'DASHBOARD',p,'TRUE'])));rows.push(['ADMIN_SEKOLAH','DASHBOARD','ADMIN','TRUE']);rpSh.getRange(2,1,rows.length,4).setValues(rows);}
}
