/**
 * SIM SATRIA Multi Sekolah — SETUP RUNNER
 *
 * ADMIN_SEKOLAH bersumber dari MASTER_USER.
 * Guru/Wali Kelas/Karyawan/Siswa bersumber dari USERS sekolah.
 */
const SETUP_CONFIG = {
  MASTER_SPREADSHEET_ID: 'GANTI_DENGAN_ID_SPREADSHEET_MASTER',
  SETUP_OWNER_EMAIL: 'GANTI_DENGAN_EMAIL_OPERATOR_MASTER',
  SEKOLAH: { id_sekolah:'SMANDA2SKJ', npsn:'20306175', nama_sekolah:'SMA Negeri 2 Sukorejo', spreadsheet_id:'GANTI_DENGAN_ID_SPREADSHEET_SEKOLAH', drive_folder_id:'GANTI_DENGAN_ID_FOLDER_DRIVE_SEKOLAH' },
  ADMIN: { id_user:'U001', nama:'Administrator Sekolah', email:'GANTI_DENGAN_EMAIL_ADMIN_SEKOLAH' },
  TEST_USERS: [
    {id_user:'U002',nama:'Guru Contoh',email:'GANTI_DENGAN_EMAIL_GURU',role:'GURU'},
    {id_user:'U003',nama:'Wali Kelas Contoh',email:'GANTI_DENGAN_EMAIL_WALI_KELAS',role:'WALI_KELAS'},
    {id_user:'U004',nama:'Karyawan Contoh',email:'GANTI_DENGAN_EMAIL_KARYAWAN',role:'KARYAWAN'},
    {id_user:'U005',nama:'Siswa Contoh',email:'GANTI_DENGAN_EMAIL_SISWA',role:'SISWA'}
  ],
  MENU_UJI:{kode_menu:'AGENDA_GURU',nama_menu:'Agenda Mengajar',parent_id:'',urutan:10,icon:'calendar'}
};

function setup01_setMasterSpreadsheet(){requireSetupValue_(SETUP_CONFIG.MASTER_SPREADSHEET_ID,'MASTER_SPREADSHEET_ID');return setMasterSpreadsheetId_(SETUP_CONFIG.MASTER_SPREADSHEET_ID);}
function setup02_setSetupOwner(){requireSetupValue_(SETUP_CONFIG.SETUP_OWNER_EMAIL,'SETUP_OWNER_EMAIL');return setSetupOwnerEmail_(SETUP_CONFIG.SETUP_OWNER_EMAIL);}
function setup03_checkSetup(){const result=getSetupStatus();Logger.log(JSON.stringify(result,null,2));return result;}
function setup04_initializeSystem(){const result=initializeSystem_();Logger.log(JSON.stringify(result,null,2));return result;}
function setup05_registerSchool(){const s=SETUP_CONFIG.SEKOLAH;['id_sekolah','npsn','nama_sekolah','spreadsheet_id','drive_folder_id'].forEach(k=>requireSetupValue_(s[k],k));const result=registerSchool(s);Logger.log(JSON.stringify(result,null,2));return result;}

/** 06 — ADMIN_SEKOLAH disimpan pada MASTER_USER sebagai sumber otoritatif. */
function setup06_registerAdmin(){
  requireSetupAccess_();
  const a=SETUP_CONFIG.ADMIN,s=SETUP_CONFIG.SEKOLAH;
  requireSetupValue_(a.email,'EMAIL_ADMIN_SEKOLAH');
  const ss=getMasterSpreadsheet_(),sh=ss.getSheetByName(MASTER.USER);
  if(!sh)throw new Error('MASTER_USER belum tersedia. Jalankan setup04_initializeSystem().');
  const rows=readSheetObjects_(ss,MASTER.USER);
  const email=a.email.toLowerCase(),schoolId=s.id_sekolah.toUpperCase();
  const existing=rows.findIndex(r=>String(r.email||'').toLowerCase()===email||String(r.id_user||'')===String(a.id_user));
  const values=[a.id_user,schoolId,a.nama,email,'ADMIN_SEKOLAH','ACTIVE'];
  if(existing>=0)sh.getRange(existing+2,1,1,6).setValues([values]);else sh.appendRow(values);
  return ok_({id_user:a.id_user,id_sekolah:schoolId,email:email,role:'ADMIN_SEKOLAH',status:'ACTIVE'},'ADMIN_SEKOLAH berhasil disimpan pada MASTER_USER.');
}

/** 07 — User contoh non-admin ditulis ke USERS sekolah. */
function setup07_registerTestUsers(){
  requireSetupAccess_();
  const school=SETUP_CONFIG.SEKOLAH;
  const schoolRow=findSchoolById_(school.id_sekolah);
  if(!schoolRow)throw new Error('Sekolah belum terdaftar pada MASTER_SEKOLAH. Jalankan setup05_registerSchool().');
  const ss=SpreadsheetApp.openById(schoolRow.spreadsheet_id);
  const admin=readSheetObjects_(getMasterSpreadsheet_(),MASTER.USER).find(r=>String(r.role).toUpperCase()==='ADMIN_SEKOLAH'&&String(r.id_sekolah).toUpperCase()===school.id_sekolah.toUpperCase());
  if(!admin)throw new Error('ADMIN_SEKOLAH belum ada di MASTER_USER. Jalankan setup06_registerAdmin().');
  ensureSchoolUsersSheet_(ss,admin);
  const results=[];
  SETUP_CONFIG.TEST_USERS.forEach(function(u){
    if(!u.email||u.email.indexOf('GANTI_DENGAN_')===0){results.push({id_user:u.id_user,role:u.role,status:'SKIPPED',message:'Email belum diisi.'});return;}
    try{const result=saveTestUserToSchoolUsers_(ss,u);results.push({id_user:u.id_user,role:u.role,status:'REGISTERED',result:result});}catch(err){results.push({id_user:u.id_user,role:u.role,status:'ERROR',message:err.message});}
  });
  Logger.log(JSON.stringify(results,null,2));return results;
}

function saveTestUserToSchoolUsers_(ss,u){
  const sh=ss.getSheetByName(SCHOOL_USERS_SHEET),values=sh.getDataRange().getValues(),headers=values[0].map(normalizeHeader_);
  const idCol=findHeaderIndex_(headers,['id_user','id','nip','nisn','username']),nameCol=findHeaderIndex_(headers,['nama','nama_user','nama_lengkap','name']),emailCol=findHeaderIndex_(headers,['email','email_user','email pengguna','akun','username']),roleCol=findHeaderIndex_(headers,['role','kode_role','jenis_user','jenis pengguna','tipe_user']),statusCol=findHeaderIndex_(headers,['status','status_user','aktif','active']);
  if([idCol,nameCol,emailCol,roleCol,statusCol].some(i=>i<0))throw new Error('Header USERS tidak lengkap.');
  for(let r=1;r<values.length;r++){if(String(values[r][emailCol]).toLowerCase()===u.email.toLowerCase()||String(values[r][idCol])===u.id_user){sh.getRange(r+1,1,1,sh.getLastColumn()).setValues([values[r]]);const row=values[r];row[idCol]=u.id_user;row[nameCol]=u.nama;row[emailCol]=u.email.toLowerCase();row[roleCol]=u.role;row[statusCol]='ACTIVE';sh.getRange(r+1,1,1,row.length).setValues([row]);return {row:r+1};}}
  const row=new Array(sh.getLastColumn()).fill('');row[idCol]=u.id_user;row[nameCol]=u.nama;row[emailCol]=u.email.toLowerCase();row[roleCol]=u.role;row[statusCol]='ACTIVE';sh.getRange(sh.getLastRow()+1,1,1,row.length).setValues([row]);return {row:sh.getLastRow()};
}

function setup08_addMenu(){const result=addMenu(SETUP_CONFIG.MENU_UJI);Logger.log(JSON.stringify(result,null,2));return result;}
function setup09_grantTestPermissions(){const menu=SETUP_CONFIG.MENU_UJI.kode_menu,roles={ADMIN_SEKOLAH:['READ','INPUT','UPLOAD','PDF','ADMIN'],GURU:['READ','INPUT','UPLOAD','PDF'],WALI_KELAS:['READ','INPUT','UPLOAD','PDF'],KARYAWAN:['READ','INPUT','UPLOAD','PDF']};const results=Object.keys(roles).map(role=>({role:role,result:grantMenuPermission(role,menu,roles[role])}));Logger.log(JSON.stringify(results,null,2));return results;}
function setup10_checkMaster(){const result={setup:getSetupStatus(),system:getSystemStatus(),summary:getMasterSummary(),schools:listMasterSchools(),users:listMasterUsers(SETUP_CONFIG.SEKOLAH.id_sekolah),menus:listMasterMenus(),guruPermissions:listRolePermissions('GURU'),adminPermissions:listRolePermissions('ADMIN_SEKOLAH')};Logger.log(JSON.stringify(result,null,2));return result;}
function requireSetupValue_(value,label){if(!value||String(value).indexOf('GANTI_DENGAN_')===0)throw new Error(label+' belum diisi pada SETUP_CONFIG di Setup.js.');}
