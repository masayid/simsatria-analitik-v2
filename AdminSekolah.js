/**
 * SIM SATRIA — ADMIN SEKOLAH
 *
 * ADMIN_SEKOLAH ditentukan HANYA dari MASTER_USER.
 * Setelah admin terverifikasi, aplikasi membuka spreadsheet sekolahnya.
 * Sheet USERS dibuat otomatis bila belum ada.
 *
 * Aturan sumber:
 * - ADMIN_SEKOLAH : MASTER_USER (pusat)
 * - GURU/WALI_KELAS/KARYAWAN/SISWA : USERS sekolah
 */

const SCHOOL_USERS_HEADERS = Object.freeze([
  'id_user',
  'nama',
  'email',
  'role',
  'status'
]);

const SCHOOL_KELAS_SHEET = 'KELAS';
const SCHOOL_KELAS_HEADERS = Object.freeze([
  'KELAS',
  'TINGKAT',
  'JURUSAN',
  'WALI_KELAS',
  'STATUS'
]);

const SCHOOL_GURU_SHEET = 'GURU';
const SCHOOL_GURU_HEADERS = Object.freeze([
  'ID_GURU',
  'NIP',
  'NAMA',
  'MAPEL',
  'STATUS',
  'SERTIFIKASI',
  'IJAZAH'
]);

const SCHOOL_KARYAWAN_SHEET = 'KARYAWAN';
const SCHOOL_KARYAWAN_HEADERS = Object.freeze([
  'ID_KARYAWAN',
  'NIP',
  'NAMA',
  'BIDANG_TUGAS',
  'STATUS',
  'IJAZAH'
]);

function getAdminSekolahContext() {
  const admin = requireAdminSekolah_();
  const school = admin.school;
  const spreadsheet = SpreadsheetApp.openById(school.spreadsheet_id);
  const sheetResult = ensureSchoolUsersSheet_(spreadsheet, admin.masterUser);
  const users = readSchoolUsersForAdmin_(spreadsheet);

  const counts = {};
  users.forEach(function(user) {
    const role = clean_(user.role).toUpperCase() || 'LAINNYA';
    counts[role] = (counts[role] || 0) + 1;
  });

  return ok_({
    admin: {
      id_user: admin.masterUser.id_user,
      nama: admin.masterUser.nama,
      email: admin.masterUser.email,
      role: APP_CONFIG.ROLE.ADMIN_SEKOLAH
    },
    school: {
      id_sekolah: clean_(school.id_sekolah).toUpperCase(),
      npsn: clean_(school.npsn),
      nama_sekolah: clean_(school.nama_sekolah),
      spreadsheet_id: clean_(school.spreadsheet_id),
      drive_folder_id: clean_(school.drive_folder_id),
      status: clean_(school.status).toUpperCase()
    },
    usersSheet: {
      name: SCHOOL_USERS_SHEET,
      created: !!sheetResult.created,
      headers: SCHOOL_USERS_HEADERS
    },
    users: users,
    counts: counts
  }, 'Panel ADMIN_SEKOLAH berhasil dimuat.');
}

function requireAdminSekolah_() {
  const email = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!email) throw new Error('Email Google pengguna tidak terdeteksi.');

  const master = getMasterSpreadsheet_();
  const masterUsersSheet = master.getSheetByName(MASTER.USER);
  if (!masterUsersSheet) throw new Error('Sheet MASTER_USER belum tersedia.');

  const masterUsers = readSheetObjects_(master, MASTER.USER);
  const masterUser = masterUsers.find(function(row) {
    return clean_(row.email).toLowerCase() === email &&
      clean_(row.role).toUpperCase() === APP_CONFIG.ROLE.ADMIN_SEKOLAH &&
      clean_(row.status).toUpperCase() !== APP_CONFIG.STATUS.INACTIVE;
  });

  if (!masterUser) {
    throw new Error('Akses ADMIN_SEKOLAH ditolak. Akun ini tidak terdaftar sebagai ADMIN_SEKOLAH pada MASTER_USER.');
  }

  const schoolId = clean_(masterUser.id_sekolah).toUpperCase();
  if (!schoolId) throw new Error('ADMIN_SEKOLAH belum memiliki id_sekolah pada MASTER_USER.');

  const school = readSheetObjects_(master, MASTER.SEKOLAH).find(function(row) {
    return clean_(row.id_sekolah).toUpperCase() === schoolId &&
      clean_(row.status).toUpperCase() === APP_CONFIG.STATUS.ACTIVE;
  });

  if (!school) throw new Error('Sekolah ADMIN_SEKOLAH tidak ditemukan atau tidak ACTIVE di MASTER_SEKOLAH.');
  if (!clean_(school.spreadsheet_id)) throw new Error('Spreadsheet sekolah belum dikonfigurasi di MASTER_SEKOLAH.');

  return { email: email, masterUser: masterUser, school: school };
}

function ensureSchoolUsersSheet_(spreadsheet, masterUser) {
  let sheet = spreadsheet.getSheetByName(SCHOOL_USERS_SHEET);
  const created = !sheet;
  if (!sheet) sheet = spreadsheet.insertSheet(SCHOOL_USERS_SHEET);

  const lastColumn = Math.max(sheet.getLastColumn(), SCHOOL_USERS_HEADERS.length);
  const currentHeaders = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0] : [];
  const matches = SCHOOL_USERS_HEADERS.every(function(header, index) {
    return normalizeHeader_(currentHeaders[index]) === normalizeHeader_(header);
  });

  if (!matches) {
    const hasData = sheet.getLastRow() > 1 || sheet.getDataRange().getValues().some(function(row) {
      return row.some(function(v) { return clean_(v) !== ''; });
    });
    if (!hasData) {
      sheet.clear();
      sheet.getRange(1, 1, 1, SCHOOL_USERS_HEADERS.length).setValues([SCHOOL_USERS_HEADERS]);
    } else {
      const headers = currentHeaders.map(clean_);
      SCHOOL_USERS_HEADERS.forEach(function(header) {
        if (headers.map(normalizeHeader_).indexOf(normalizeHeader_(header)) < 0) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      });
    }
  }

  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, SCHOOL_USERS_HEADERS.length).setValues([SCHOOL_USERS_HEADERS]);

  const headersNow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(clean_);
  const normalized = headersNow.map(normalizeHeader_);
  const emailCol = findHeaderIndex_(normalized, ['email','email_user','email pengguna','akun','username']);
  const roleCol = findHeaderIndex_(normalized, ['role','kode_role','jenis_user','jenis pengguna','tipe_user']);
  const idCol = findHeaderIndex_(normalized, ['id_user','id','nip','nisn','username']);
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues() : [];
  const adminEmail = clean_(masterUser.email).toLowerCase();
  const adminExists = rows.some(function(row) {
    return emailCol >= 0 && clean_(row[emailCol]).toLowerCase() === adminEmail && roleCol >= 0 && clean_(row[roleCol]).toUpperCase() === APP_CONFIG.ROLE.ADMIN_SEKOLAH;
  });

  if (!adminExists) {
    const newRow = new Array(sheet.getLastColumn()).fill('');
    if (idCol >= 0) newRow[idCol] = clean_(masterUser.id_user);
    const nameCol = findHeaderIndex_(normalized, ['nama','nama_user','nama_lengkap','name']);
    if (nameCol >= 0) newRow[nameCol] = clean_(masterUser.nama);
    if (emailCol >= 0) newRow[emailCol] = adminEmail;
    if (roleCol >= 0) newRow[roleCol] = APP_CONFIG.ROLE.ADMIN_SEKOLAH;
    const statusCol = findHeaderIndex_(normalized, ['status','status_user','aktif','active']);
    if (statusCol >= 0) newRow[statusCol] = APP_CONFIG.STATUS.ACTIVE;
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);
  }
  sheet.setFrozenRows(1);
  return { created: created, sheet: SCHOOL_USERS_SHEET, rows: sheet.getLastRow() - 1 };
}

function readSchoolUsersForAdmin_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SCHOOL_USERS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(normalizeHeader_);
  const idCol = findHeaderIndex_(headers, ['id_user','id','nip','nisn','username']);
  const nameCol = findHeaderIndex_(headers, ['nama','nama_user','nama_lengkap','name']);
  const emailCol = findHeaderIndex_(headers, ['email','email_user','email pengguna','akun','username']);
  const roleCol = findHeaderIndex_(headers, ['role','kode_role','jenis_user','jenis pengguna','tipe_user']);
  const statusCol = findHeaderIndex_(headers, ['status','status_user','aktif','active']);
  return values.slice(1).map(function(row, index) {
    const email = emailCol >= 0 ? clean_(row[emailCol]).toLowerCase() : '';
    const id = idCol >= 0 ? clean_(row[idCol]) : '';
    const nama = nameCol >= 0 ? clean_(row[nameCol]) : '';
    if (!email && !id && !nama) return null;
    return {_row:index+2,id_user:id,nama:nama,email:email,role:roleCol>=0?clean_(row[roleCol]).toUpperCase():'',status:statusCol>=0?(normalizeUserStatus_(row[statusCol])||APP_CONFIG.STATUS.ACTIVE):APP_CONFIG.STATUS.ACTIVE};
  }).filter(Boolean);
}

function getAdminSchoolUsers() {
  const admin = requireAdminSekolah_();
  const spreadsheet = SpreadsheetApp.openById(admin.school.spreadsheet_id);
  ensureSchoolUsersSheet_(spreadsheet, admin.masterUser);
  return ok_(readSchoolUsersForAdmin_(spreadsheet));
}

function saveAdminSchoolUser(data) {
  const admin = requireAdminSekolah_();
  const payload = data || {};
  const spreadsheet = SpreadsheetApp.openById(admin.school.spreadsheet_id);
  ensureSchoolUsersSheet_(spreadsheet, admin.masterUser);
  const sheet = spreadsheet.getSheetByName(SCHOOL_USERS_SHEET);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(normalizeHeader_);
  const idCol=findHeaderIndex_(headers,['id_user','id','nip','nisn','username']);
  const nameCol=findHeaderIndex_(headers,['nama','nama_user','nama_lengkap','name']);
  const emailCol=findHeaderIndex_(headers,['email','email_user','email pengguna','akun','username']);
  const roleCol=findHeaderIndex_(headers,['role','kode_role','jenis_user','jenis pengguna','tipe_user']);
  const statusCol=findHeaderIndex_(headers,['status','status_user','aktif','active']);
  if(idCol<0||nameCol<0||emailCol<0||roleCol<0||statusCol<0)throw new Error('Header USERS harus memiliki id_user, nama, email, role, status.');
  const id=clean_(payload.id_user),nama=clean_(payload.nama),email=clean_(payload.email).toLowerCase(),role=normalizeUserRole_(payload.role),status=normalizeUserStatus_(payload.status)||APP_CONFIG.STATUS.ACTIVE,rowNumber=Number(payload._row||0);
  if(!id||!nama||!email)throw new Error('ID user, nama, dan email wajib diisi.');
  if(!email.includes('@'))throw new Error('Format email tidak valid.');
  if(!role||[APP_CONFIG.ROLE.ADMIN_SEKOLAH,APP_CONFIG.ROLE.GURU,APP_CONFIG.ROLE.WALI_KELAS,APP_CONFIG.ROLE.KARYAWAN,APP_CONFIG.ROLE.SISWA].indexOf(role)<0)throw new Error('Role user tidak valid.');
  const activeEmail=admin.masterUser.email.toLowerCase(),isSelf=email===activeEmail;
  if(isSelf&&role!==APP_CONFIG.ROLE.ADMIN_SEKOLAH)throw new Error('Role ADMIN_SEKOLAH milik akun administrator tidak boleh diubah.');
  if(isSelf&&status!==APP_CONFIG.STATUS.ACTIVE)throw new Error('Akun administrator yang sedang digunakan tidak boleh dinonaktifkan.');
  for(let r=1;r<values.length;r++){if(rowNumber&&r+1===rowNumber)continue;const existingEmail=clean_(values[r][emailCol]).toLowerCase(),existingId=clean_(values[r][idCol]);if(existingEmail===email)throw new Error('Email user sudah terdaftar di USERS sekolah.');if(existingId===id)throw new Error('ID user sudah terdaftar di USERS sekolah.');}
  const row=rowNumber>=2&&rowNumber<=sheet.getLastRow()?sheet.getRange(rowNumber,1,1,sheet.getLastColumn()).getValues()[0]:new Array(sheet.getLastColumn()).fill('');
  row[idCol]=id;row[nameCol]=nama;row[emailCol]=email;row[roleCol]=role;row[statusCol]=status;
  const targetRow=rowNumber>=2&&rowNumber<=sheet.getLastRow()?rowNumber:sheet.getLastRow()+1;
  sheet.getRange(targetRow,1,1,row.length).setValues([row]);
  return ok_({row:targetRow,users:readSchoolUsersForAdmin_(spreadsheet)},'User sekolah berhasil disimpan.');
}

function deleteAdminSchoolUser(rowNumber) {
  const admin=requireAdminSekolah_();
  const spreadsheet=SpreadsheetApp.openById(admin.school.spreadsheet_id);
  ensureSchoolUsersSheet_(spreadsheet,admin.masterUser);
  const sheet=spreadsheet.getSheetByName(SCHOOL_USERS_SHEET),row=Number(rowNumber);
  if(row<2||row>sheet.getLastRow())throw new Error('Baris user tidak valid.');
  const values=sheet.getRange(row,1,1,sheet.getLastColumn()).getValues()[0],headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(normalizeHeader_);
  const emailCol=findHeaderIndex_(headers,['email','email_user','email pengguna','akun','username']),roleCol=findHeaderIndex_(headers,['role','kode_role','jenis_user','jenis pengguna','tipe_user']);
  const email=emailCol>=0?clean_(values[emailCol]).toLowerCase():'',role=roleCol>=0?clean_(values[roleCol]).toUpperCase():'';
  if(email===admin.masterUser.email.toLowerCase()||role===APP_CONFIG.ROLE.ADMIN_SEKOLAH)throw new Error('ADMIN_SEKOLAH tidak dapat dihapus dari USERS. Akun admin bersumber dari MASTER_USER.');
  sheet.deleteRow(row);
  return ok_(readSchoolUsersForAdmin_(spreadsheet),'User sekolah berhasil dihapus.');
}

function ensureAdminSchoolUsersSheet(){const admin=requireAdminSekolah_(),spreadsheet=SpreadsheetApp.openById(admin.school.spreadsheet_id);return ok_(ensureSchoolUsersSheet_(spreadsheet,admin.masterUser),'Sheet USERS berhasil diperiksa/dibuat.');}

function ensureAdminSchoolKelasSheet_(){requireAdminSekolah_();return gatewayCall_('SPREADSHEET_ENSURE_SHEET',{sheet:SCHOOL_KELAS_SHEET,headers:SCHOOL_KELAS_HEADERS.slice()});}
function getAdminSchoolKelas(){
  requireAdminSekolah_();ensureAdminSchoolKelasSheet_();
  const result=readSheetViaGateway(SCHOOL_KELAS_SHEET),data=result&&result.data?result.data:result,values=data&&Array.isArray(data.values)?data.values:[];
  if(values.length<2)return ok_({sheet:SCHOOL_KELAS_SHEET,headers:SCHOOL_KELAS_HEADERS.slice(),rows:[],total:0},'Sheet KELAS siap digunakan dan belum memiliki data.');
  const headers=values[0].map(function(v){return clean_(v).toUpperCase();}),index={};SCHOOL_KELAS_HEADERS.forEach(function(header){index[header]=headers.indexOf(header);});
  const missing=SCHOOL_KELAS_HEADERS.filter(function(header){return index[header]<0;});if(missing.length)throw new Error('Header KELAS tidak lengkap: '+missing.join(', '));
  const rows=values.slice(1).map(function(row,i){if(!row.some(function(v){return clean_(v)!=='';}))return null;return {_row:i+2,KELAS:clean_(row[index.KELAS]),TINGKAT:clean_(row[index.TINGKAT]),JURUSAN:clean_(row[index.JURUSAN]),WALI_KELAS:clean_(row[index.WALI_KELAS]),STATUS:clean_(row[index.STATUS]).toUpperCase()||APP_CONFIG.STATUS.ACTIVE};}).filter(Boolean);
  return ok_({sheet:SCHOOL_KELAS_SHEET,headers:SCHOOL_KELAS_HEADERS.slice(),rows:rows,total:rows.length},'Data KELAS berhasil dimuat.');
}
function saveAdminSchoolKelas(data){
  requireAdminSekolah_();const payload=data||{};ensureAdminSchoolKelasSheet_();
  const kelas=clean_(payload.KELAS),tingkat=clean_(payload.TINGKAT).toUpperCase(),jurusan=clean_(payload.JURUSAN),wali=clean_(payload.WALI_KELAS),status=clean_(payload.STATUS).toUpperCase()||APP_CONFIG.STATUS.ACTIVE,rowNumber=Number(payload._row||0);
  if(!kelas)throw new Error('KELAS wajib diisi.');if(['X','XI','XII'].indexOf(tingkat)<0)throw new Error('TINGKAT harus X, XI, atau XII.');if(!jurusan)throw new Error('JURUSAN wajib diisi.');if(['ACTIVE','INACTIVE'].indexOf(status)<0)throw new Error('STATUS tidak valid.');
  const currentResult=readSheetViaGateway(SCHOOL_KELAS_SHEET),currentData=currentResult&&currentResult.data?currentResult.data:currentResult,values=currentData&&Array.isArray(currentData.values)?currentData.values:[],headers=values.length?values[0].map(function(v){return clean_(v).toUpperCase();}):SCHOOL_KELAS_HEADERS.slice(),idxKelas=headers.indexOf('KELAS');
  if(idxKelas<0)throw new Error('Kolom KELAS tidak ditemukan.');
  for(let i=1;i<values.length;i++){const existingRow=i+1;if(rowNumber&&existingRow===rowNumber)continue;if(clean_(values[i][idxKelas]).toUpperCase()===kelas.toUpperCase())throw new Error('KELAS '+kelas+' sudah terdaftar.');}
  const row=SCHOOL_KELAS_HEADERS.map(function(header){if(header==='KELAS')return kelas;if(header==='TINGKAT')return tingkat;if(header==='JURUSAN')return jurusan;if(header==='WALI_KELAS')return wali;if(header==='STATUS')return status;return '';});
  if(rowNumber>=2)gatewayCall_('SPREADSHEET_UPDATE_ROW',{sheet:SCHOOL_KELAS_SHEET,rowNumber:rowNumber,row:row});else gatewayCall_('SPREADSHEET_APPEND',{sheet:SCHOOL_KELAS_SHEET,row:row});
  return getAdminSchoolKelas();
}
function deleteAdminSchoolKelas(rowNumber){requireAdminSekolah_();ensureAdminSchoolKelasSheet_();const row=Number(rowNumber);if(!(row>=2))throw new Error('Baris KELAS tidak valid.');gatewayCall_('SPREADSHEET_DELETE_ROW',{sheet:SCHOOL_KELAS_SHEET,rowNumber:row});return getAdminSchoolKelas();}
function ensureAdminSchoolKelasSheet(){const result=ensureAdminSchoolKelasSheet_();return ok_(result&&result.data?result.data:result,'Sheet KELAS berhasil diperiksa/dibuat.');}

function ensureAdminSchoolGuruSheet_(){requireAdminSekolah_();return gatewayCall_('SPREADSHEET_ENSURE_SHEET',{sheet:SCHOOL_GURU_SHEET,headers:SCHOOL_GURU_HEADERS.slice()});}
function readAdminSchoolGuru_(){
  const result=readSheetViaGateway(SCHOOL_GURU_SHEET),data=result&&result.data?result.data:result,values=data&&Array.isArray(data.values)?data.values:[];
  if(values.length<2)return [];
  const headers=values[0].map(function(v){return clean_(v).toUpperCase();}),index={};SCHOOL_GURU_HEADERS.forEach(function(header){index[header]=headers.indexOf(header);});
  const missing=SCHOOL_GURU_HEADERS.filter(function(header){return index[header]<0;});if(missing.length)throw new Error('Header GURU tidak lengkap: '+missing.join(', '));
  return values.slice(1).map(function(row,i){if(!row.some(function(v){return clean_(v)!=='';}))return null;return {_row:i+2,ID_GURU:clean_(row[index.ID_GURU]),NIP:clean_(row[index.NIP]),NAMA:clean_(row[index.NAMA]),MAPEL:clean_(row[index.MAPEL]),STATUS:clean_(row[index.STATUS]).toUpperCase()||APP_CONFIG.STATUS.ACTIVE,SERTIFIKASI:clean_(row[index.SERTIFIKASI]),IJAZAH:clean_(row[index.IJAZAH])};}).filter(Boolean);
}
function getAdminSchoolGuru(){requireAdminSekolah_();ensureAdminSchoolGuruSheet_();const rows=readAdminSchoolGuru_();return ok_({sheet:SCHOOL_GURU_SHEET,headers:SCHOOL_GURU_HEADERS.slice(),rows:rows,total:rows.length,perPage:10},'Data GURU berhasil dimuat.');}
function saveAdminSchoolGuru(data){
  requireAdminSekolah_();const payload=data||{};ensureAdminSchoolGuruSheet_();const id=clean_(payload.ID_GURU),nip=clean_(payload.NIP),nama=clean_(payload.NAMA),mapel=clean_(payload.MAPEL),status=clean_(payload.STATUS).toUpperCase()||APP_CONFIG.STATUS.ACTIVE,sertifikasi=clean_(payload.SERTIFIKASI),ijazah=clean_(payload.IJAZAH),rowNumber=Number(payload._row||0);
  if(!id)throw new Error('ID_GURU wajib diisi.');if(!nama)throw new Error('NAMA guru wajib diisi.');if(!mapel)throw new Error('MAPEL wajib diisi.');if(['ACTIVE','INACTIVE'].indexOf(status)<0)throw new Error('STATUS harus ACTIVE atau INACTIVE.');
  const rows=readAdminSchoolGuru_();rows.forEach(function(row){if(Number(row._row)===rowNumber)return;if(clean_(row.ID_GURU).toUpperCase()===id.toUpperCase())throw new Error('ID_GURU sudah terdaftar: '+id);if(nip&&clean_(row.NIP).toUpperCase()===nip.toUpperCase())throw new Error('NIP sudah terdaftar: '+nip);});
  const row=[id,nip,nama,mapel,status,sertifikasi,ijazah];if(rowNumber>=2)gatewayCall_('SPREADSHEET_UPDATE_ROW',{sheet:SCHOOL_GURU_SHEET,rowNumber:rowNumber,row:row});else gatewayCall_('SPREADSHEET_APPEND',{sheet:SCHOOL_GURU_SHEET,row:row});return getAdminSchoolGuru();
}
function deleteAdminSchoolGuru(rowNumber){requireAdminSekolah_();ensureAdminSchoolGuruSheet_();const row=Number(rowNumber);if(row<2)throw new Error('Baris GURU tidak valid.');gatewayCall_('SPREADSHEET_DELETE_ROW',{sheet:SCHOOL_GURU_SHEET,rowNumber:row});return getAdminSchoolGuru();}
function importAdminSchoolGuru(rows){
  requireAdminSekolah_();ensureAdminSchoolGuruSheet_();if(!Array.isArray(rows)||!rows.length)throw new Error('Data template GURU kosong.');if(rows.length>500)throw new Error('Maksimal 500 baris per upload template.');const existing=readAdminSchoolGuru_(),ids={},nips={};existing.forEach(function(r){ids[clean_(r.ID_GURU).toUpperCase()]=true;if(clean_(r.NIP))nips[clean_(r.NIP).toUpperCase()]=true;});let inserted=0,skipped=0,errors=[];
  rows.forEach(function(item,i){const id=clean_(item.ID_GURU),nip=clean_(item.NIP),nama=clean_(item.NAMA),mapel=clean_(item.MAPEL),status=clean_(item.STATUS).toUpperCase()||APP_CONFIG.STATUS.ACTIVE,sertifikasi=clean_(item.SERTIFIKASI),ijazah=clean_(item.IJAZAH);if(!id||!nama||!mapel||['ACTIVE','INACTIVE'].indexOf(status)<0){errors.push('Baris '+(i+2)+': ID_GURU, NAMA, MAPEL wajib dan STATUS harus ACTIVE/INACTIVE.');return;}if(ids[id.toUpperCase()]){skipped++;return;}if(nip&&nips[nip.toUpperCase()]){skipped++;return;}gatewayCall_('SPREADSHEET_APPEND',{sheet:SCHOOL_GURU_SHEET,row:[id,nip,nama,mapel,status,sertifikasi,ijazah]});ids[id.toUpperCase()]=true;if(nip)nips[nip.toUpperCase()]=true;inserted++;});
  const result=getAdminSchoolGuru();return ok_({inserted:inserted,skipped:skipped,errors:errors,rows:result.data.rows,total:result.data.total},'Template GURU selesai diproses.');
}
function getSchoolGuruDirectory(){const session=getSessionContext();if(!session||session.ok!==true||!session.data||!session.data.school)throw new Error('Sesi sekolah tidak tersedia.');const result=readSheetViaGateway(SCHOOL_GURU_SHEET),data=result&&result.data?result.data:result,values=data&&Array.isArray(data.values)?data.values:[];if(values.length<2)return ok_([],'Directory GURU belum memiliki data.');const headers=values[0].map(function(v){return clean_(v).toUpperCase();}),idxId=headers.indexOf('ID_GURU'),idxNip=headers.indexOf('NIP'),idxNama=headers.indexOf('NAMA'),idxMapel=headers.indexOf('MAPEL'),idxStatus=headers.indexOf('STATUS');if(idxNama<0)throw new Error('Kolom NAMA pada GURU tidak ditemukan.');const rows=[];for(let i=1;i<values.length;i++){const nama=clean_(values[i][idxNama]);if(!nama)continue;const status=idxStatus>=0?clean_(values[i][idxStatus]).toUpperCase():'ACTIVE';if(status==='INACTIVE')continue;rows.push({ID_GURU:idxId>=0?clean_(values[i][idxId]):'',NIP:idxNip>=0?clean_(values[i][idxNip]):'',NAMA:nama,MAPEL:idxMapel>=0?clean_(values[i][idxMapel]):'',STATUS:status});}return ok_(rows,'Directory GURU berhasil dimuat.');}
function ensureAdminSchoolGuruSheet(){const result=ensureAdminSchoolGuruSheet_();return ok_(result&&result.data?result.data:result,'Sheet GURU berhasil diperiksa/dibuat.');}

/* KARYAWAN dipertahankan di AdminSekolah.js agar seluruh administrasi sekolah tetap terpusat. */
function ensureAdminSchoolKaryawanSheet_(){requireAdminSekolah_();return gatewayCall_('SPREADSHEET_ENSURE_SHEET',{sheet:SCHOOL_KARYAWAN_SHEET,headers:SCHOOL_KARYAWAN_HEADERS.slice()});}
function readAdminSchoolKaryawan_(){
  const result=readSheetViaGateway(SCHOOL_KARYAWAN_SHEET),data=result&&result.data?result.data:result,values=data&&Array.isArray(data.values)?data.values:[];
  if(values.length<2)return [];
  const headers=values[0].map(function(v){return clean_(v).toUpperCase();}),index={};SCHOOL_KARYAWAN_HEADERS.forEach(function(header){index[header]=headers.indexOf(header);});
  const missing=SCHOOL_KARYAWAN_HEADERS.filter(function(header){return index[header]<0;});if(missing.length)throw new Error('Header KARYAWAN tidak lengkap: '+missing.join(', '));
  return values.slice(1).map(function(row,i){if(!row.some(function(v){return clean_(v)!=='';}))return null;return {_row:i+2,ID_KARYAWAN:clean_(row[index.ID_KARYAWAN]),NIP:clean_(row[index.NIP]),NAMA:clean_(row[index.NAMA]),BIDANG_TUGAS:clean_(row[index.BIDANG_TUGAS]),STATUS:clean_(row[index.STATUS]).toUpperCase()||APP_CONFIG.STATUS.ACTIVE,IJAZAH:clean_(row[index.IJAZAH])};}).filter(Boolean);
}
function getAdminSchoolKaryawan(){requireAdminSekolah_();ensureAdminSchoolKaryawanSheet_();const rows=readAdminSchoolKaryawan_();return ok_({sheet:SCHOOL_KARYAWAN_SHEET,headers:SCHOOL_KARYAWAN_HEADERS.slice(),rows:rows,total:rows.length,perPage:10},'Data KARYAWAN berhasil dimuat.');}
function saveAdminSchoolKaryawan(data){
  requireAdminSekolah_();const payload=data||{};ensureAdminSchoolKaryawanSheet_();const id=clean_(payload.ID_KARYAWAN),nip=clean_(payload.NIP),nama=clean_(payload.NAMA),bidang=clean_(payload.BIDANG_TUGAS),status=clean_(payload.STATUS).toUpperCase()||APP_CONFIG.STATUS.ACTIVE,ijazah=clean_(payload.IJAZAH),rowNumber=Number(payload._row||0);
  if(!id)throw new Error('ID_KARYAWAN wajib diisi.');if(!nama)throw new Error('NAMA karyawan wajib diisi.');if(!bidang)throw new Error('BIDANG_TUGAS wajib diisi.');if(['ACTIVE','INACTIVE'].indexOf(status)<0)throw new Error('STATUS harus ACTIVE atau INACTIVE.');
  const rows=readAdminSchoolKaryawan_();rows.forEach(function(row){if(Number(row._row)===rowNumber)return;if(clean_(row.ID_KARYAWAN).toUpperCase()===id.toUpperCase())throw new Error('ID_KARYAWAN sudah terdaftar: '+id);if(nip&&clean_(row.NIP).toUpperCase()===nip.toUpperCase())throw new Error('NIP sudah terdaftar: '+nip);});
  const row=[id,nip,nama,bidang,status,ijazah];if(rowNumber>=2)gatewayCall_('SPREADSHEET_UPDATE_ROW',{sheet:SCHOOL_KARYAWAN_SHEET,rowNumber:rowNumber,row:row});else gatewayCall_('SPREADSHEET_APPEND',{sheet:SCHOOL_KARYAWAN_SHEET,row:row});return getAdminSchoolKaryawan();
}
function deleteAdminSchoolKaryawan(rowNumber){requireAdminSekolah_();ensureAdminSchoolKaryawanSheet_();const row=Number(rowNumber);if(row<2)throw new Error('Baris KARYAWAN tidak valid.');gatewayCall_('SPREADSHEET_DELETE_ROW',{sheet:SCHOOL_KARYAWAN_SHEET,rowNumber:row});return getAdminSchoolKaryawan();}
function importAdminSchoolKaryawan(rows){
  requireAdminSekolah_();ensureAdminSchoolKaryawanSheet_();if(!Array.isArray(rows)||!rows.length)throw new Error('Data template KARYAWAN kosong.');if(rows.length>500)throw new Error('Maksimal 500 baris per upload template.');const existing=readAdminSchoolKaryawan_(),ids={},nips={};existing.forEach(function(r){ids[clean_(r.ID_KARYAWAN).toUpperCase()]=true;if(clean_(r.NIP))nips[clean_(r.NIP).toUpperCase()]=true;});let inserted=0,skipped=0,errors=[];
  rows.forEach(function(item,i){const id=clean_(item.ID_KARYAWAN),nip=clean_(item.NIP),nama=clean_(item.NAMA),bidang=clean_(item.BIDANG_TUGAS),status=clean_(item.STATUS).toUpperCase()||APP_CONFIG.STATUS.ACTIVE,ijazah=clean_(item.IJAZAH);if(!id||!nama||!bidang||['ACTIVE','INACTIVE'].indexOf(status)<0){errors.push('Baris '+(i+2)+': ID_KARYAWAN, NAMA, BIDANG_TUGAS wajib dan STATUS harus ACTIVE/INACTIVE.');return;}if(ids[id.toUpperCase()]){skipped++;return;}if(nip&&nips[nip.toUpperCase()]){skipped++;return;}gatewayCall_('SPREADSHEET_APPEND',{sheet:SCHOOL_KARYAWAN_SHEET,row:[id,nip,nama,bidang,status,ijazah]});ids[id.toUpperCase()]=true;if(nip)nips[nip.toUpperCase()]=true;inserted++;});
  const result=getAdminSchoolKaryawan();return ok_({inserted:inserted,skipped:skipped,errors:errors,rows:result.data.rows,total:result.data.total},'Template KARYAWAN selesai diproses.');
}
function getSchoolKaryawanDirectory(){const session=getSessionContext();if(!session||session.ok!==true||!session.data||!session.data.school)throw new Error('Sesi sekolah tidak tersedia.');const result=readSheetViaGateway(SCHOOL_KARYAWAN_SHEET),data=result&&result.data?result.data:result,values=data&&Array.isArray(data.values)?data.values:[];if(values.length<2)return ok_([],'Directory KARYAWAN belum memiliki data.');const headers=values[0].map(function(v){return clean_(v).toUpperCase();}),idxId=headers.indexOf('ID_KARYAWAN'),idxNip=headers.indexOf('NIP'),idxNama=headers.indexOf('NAMA'),idxBidang=headers.indexOf('BIDANG_TUGAS'),idxStatus=headers.indexOf('STATUS');if(idxNama<0)throw new Error('Kolom NAMA pada KARYAWAN tidak ditemukan.');const rows=[];for(let i=1;i<values.length;i++){const nama=clean_(values[i][idxNama]);if(!nama)continue;const status=idxStatus>=0?clean_(values[i][idxStatus]).toUpperCase():'ACTIVE';if(status==='INACTIVE')continue;rows.push({ID_KARYAWAN:idxId>=0?clean_(values[i][idxId]):'',NIP:idxNip>=0?clean_(values[i][idxNip]):'',NAMA:nama,BIDANG_TUGAS:idxBidang>=0?clean_(values[i][idxBidang]):'',STATUS:status});}return ok_(rows,'Directory KARYAWAN berhasil dimuat.');}
function ensureAdminSchoolKaryawanSheet(){const result=ensureAdminSchoolKaryawanSheet_();return ok_(result&&result.data?result.data:result,'Sheet KARYAWAN berhasil diperiksa/dibuat.');}
