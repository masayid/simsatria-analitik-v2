/**
 * USER DIRECTORY — SUMBER USER PER SEKOLAH
 *
 * ADMIN_SEKOLAH berasal dari MASTER_USER.
 * Guru/Wali Kelas/Karyawan/Siswa berasal dari USERS sekolah masing-masing.
 */
const SCHOOL_USERS_SHEET = 'USERS';

/** Resolver user aplikasi: ADMIN_SEKOLAH dari MASTER_USER, user lain dari USERS sekolah. */
function findUserByEmailFromSchoolUsers_(email) {
  const targetEmail = clean_(email).toLowerCase();
  if (!targetEmail) return null;

  const master = getMasterSpreadsheet_();
  const masterUsers = readSheetObjects_(master, MASTER.USER);
  const masterAdmin = masterUsers.find(function(row) {
    return clean_(row.email).toLowerCase() === targetEmail &&
      clean_(row.role).toUpperCase() === APP_CONFIG.ROLE.ADMIN_SEKOLAH &&
      clean_(row.status).toUpperCase() !== APP_CONFIG.STATUS.INACTIVE;
  });

  if (masterAdmin) {
    const schoolId = clean_(masterAdmin.id_sekolah).toUpperCase();
    const school = readSheetObjects_(master, MASTER.SEKOLAH).find(function(row) {
      return clean_(row.id_sekolah).toUpperCase() === schoolId &&
        clean_(row.status).toUpperCase() === APP_CONFIG.STATUS.ACTIVE;
    });
    if (!school) throw new Error('Sekolah ADMIN_SEKOLAH tidak ditemukan pada MASTER_SEKOLAH.');
    return {
      id_user: clean_(masterAdmin.id_user),
      nama: clean_(masterAdmin.nama),
      email: targetEmail,
      role: APP_CONFIG.ROLE.ADMIN_SEKOLAH,
      status: APP_CONFIG.STATUS.ACTIVE,
      id_sekolah: schoolId,
      npsn: clean_(school.npsn),
      nama_sekolah: clean_(school.nama_sekolah),
      spreadsheet_id: clean_(school.spreadsheet_id),
      _source: MASTER.USER
    };
  }

  const schools = readSheetObjects_(master, MASTER.SEKOLAH)
    .filter(function(row) { return clean_(row.status).toUpperCase() === APP_CONFIG.STATUS.ACTIVE; });

  for (let i = 0; i < schools.length; i++) {
    const user = findUserInSchool_(schools[i], targetEmail);
    if (user) return user;
  }
  return null;
}

function findUserInSchool_(school, targetEmail) {
  const spreadsheetId = clean_(school && school.spreadsheet_id);
  if (!spreadsheetId) return null;
  let ss;
  try { ss = SpreadsheetApp.openById(spreadsheetId); } catch (e) { return null; }
  const sheet = ss.getSheetByName(SCHOOL_USERS_SHEET);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return null;

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(normalizeHeader_);
  const emailIndex = findHeaderIndex_(headers, ['email','email_user','email pengguna','akun','username']);
  if (emailIndex < 0) return null;

  for (let r = 1; r < values.length; r++) {
    const row = values[r], rowEmail = clean_(row[emailIndex]).toLowerCase();
    if (!rowEmail || rowEmail !== targetEmail) continue;
    const obj = rowToObject_(headers, row);
    const role = normalizeUserRole_(firstValue_(obj, ['role','kode_role','jenis_user','jenis pengguna','tipe_user','tipe pengguna']));
    const status = normalizeUserStatus_(firstValue_(obj, ['status','status_user','aktif','active']));
    if (status && status !== APP_CONFIG.STATUS.ACTIVE) return null;
    return {
      id_user: firstValue_(obj, ['id_user','id','nip','nisn','username']) || '',
      nama: firstValue_(obj, ['nama','nama_user','nama_lengkap','name']) || '',
      email: rowEmail,
      role: role || APP_CONFIG.ROLE.GURU,
      status: status || APP_CONFIG.STATUS.ACTIVE,
      id_sekolah: clean_(school.id_sekolah).toUpperCase(),
      npsn: clean_(school.npsn),
      nama_sekolah: clean_(school.nama_sekolah),
      spreadsheet_id: spreadsheetId,
      _source: SCHOOL_USERS_SHEET
    };
  }
  return null;
}

function getSchoolUsers_(school) {
  const spreadsheetId = clean_(school && school.spreadsheet_id);
  if (!spreadsheetId) return [];
  let ss;
  try { ss = SpreadsheetApp.openById(spreadsheetId); } catch (e) { return []; }
  const sheet = ss.getSheetByName(SCHOOL_USERS_SHEET);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(normalizeHeader_);
  const emailIndex = findHeaderIndex_(headers, ['email','email_user','email pengguna','akun','username']);
  if (emailIndex < 0) return [];
  return values.slice(1).map(function(row, index) {
    const obj = rowToObject_(headers, row), email = clean_(row[emailIndex]).toLowerCase();
    if (!email) return null;
    const role = normalizeUserRole_(firstValue_(obj, ['role','kode_role','jenis_user','jenis pengguna','tipe_user','tipe pengguna']));
    const status = normalizeUserStatus_(firstValue_(obj, ['status','status_user','aktif','active']));
    return {
      _row: index + 2,
      id_user: firstValue_(obj, ['id_user','id','nip','nisn','username']) || '',
      nama: firstValue_(obj, ['nama','nama_user','nama_lengkap','name']) || '',
      email: email,
      role: role || '',
      status: status || APP_CONFIG.STATUS.ACTIVE,
      id_sekolah: clean_(school.id_sekolah).toUpperCase(),
      npsn: clean_(school.npsn),
      nama_sekolah: clean_(school.nama_sekolah),
      spreadsheet_id: spreadsheetId,
      _source: SCHOOL_USERS_SHEET
    };
  }).filter(Boolean);
}

/** OWNER: gabungan admin MASTER_USER + user USERS sekolah. */
function getAllSchoolUsers_() {
  requireMasterOwner_();
  const master = getMasterSpreadsheet_();
  const schools = readSheetObjects_(master, MASTER.SEKOLAH).filter(function(row) {
    return clean_(row.status).toUpperCase() === APP_CONFIG.STATUS.ACTIVE;
  });
  const result = [];
  const seen = {};

  readSheetObjects_(master, MASTER.USER).forEach(function(row) {
    if (clean_(row.role).toUpperCase() !== APP_CONFIG.ROLE.ADMIN_SEKOLAH) return;
    if (clean_(row.status).toUpperCase() === APP_CONFIG.STATUS.INACTIVE) return;
    const school = schools.find(function(s) { return clean_(s.id_sekolah).toUpperCase() === clean_(row.id_sekolah).toUpperCase(); });
    if (!school) return;
    const email = clean_(row.email).toLowerCase();
    if (!email || seen[email]) return;
    seen[email] = true;
    result.push({
      _row: 0,
      id_user: clean_(row.id_user),
      nama: clean_(row.nama),
      email: email,
      role: APP_CONFIG.ROLE.ADMIN_SEKOLAH,
      status: APP_CONFIG.STATUS.ACTIVE,
      id_sekolah: clean_(school.id_sekolah).toUpperCase(),
      npsn: clean_(school.npsn),
      nama_sekolah: clean_(school.nama_sekolah),
      spreadsheet_id: clean_(school.spreadsheet_id),
      _source: MASTER.USER
    });
  });

  schools.forEach(function(school) {
    getSchoolUsers_(school).forEach(function(user) {
      const email = clean_(user.email).toLowerCase();
      if (!email || seen[email]) return;
      seen[email] = true;
      result.push(user);
    });
  });
  return result;
}

function normalizeHeader_(value) { return clean_(value).toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function findHeaderIndex_(headers, candidates) { for (let i=0;i<candidates.length;i++){const index=headers.indexOf(normalizeHeader_(candidates[i]));if(index>=0)return index;} return -1; }
function rowToObject_(headers,row){const obj={};headers.forEach(function(header,index){if(header)obj[header]=row[index];});return obj;}
function firstValue_(obj,keys){for(let i=0;i<keys.length;i++){const key=normalizeHeader_(keys[i]);if(Object.prototype.hasOwnProperty.call(obj,key)){const value=clean_(obj[key]);if(value)return value;}}return '';}
function normalizeUserRole_(value){const raw=clean_(value).toUpperCase();if(!raw)return '';if(raw==='GURU'||raw==='TEACHER')return APP_CONFIG.ROLE.GURU;if(raw==='WALI KELAS'||raw==='WALI_KELAS'||raw==='WALIKELAS')return APP_CONFIG.ROLE.WALI_KELAS;if(raw==='KARYAWAN'||raw==='STAFF'||raw==='TENAGA KEPENDIDIKAN')return APP_CONFIG.ROLE.KARYAWAN;if(raw==='SISWA'||raw==='STUDENT'||raw==='MURID')return APP_CONFIG.ROLE.SISWA;if(raw==='ADMIN'||raw==='ADMIN SEKOLAH'||raw==='ADMIN_SEKOLAH')return APP_CONFIG.ROLE.ADMIN_SEKOLAH;return raw;}
function normalizeUserStatus_(value){const raw=clean_(value).toUpperCase();if(!raw)return '';if(['TRUE','YA','YES','AKTIF','ACTIVE','1'].indexOf(raw)>=0)return APP_CONFIG.STATUS.ACTIVE;if(['FALSE','TIDAK','NO','NONAKTIF','INACTIVE','0'].indexOf(raw)>=0)return APP_CONFIG.STATUS.INACTIVE;return raw;}
