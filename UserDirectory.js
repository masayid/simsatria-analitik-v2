/**
 * USER DIRECTORY — SUMBER USER PER SEKOLAH
 *
 * MASTER_USER tidak lagi menjadi sumber akun Guru/Karyawan/Siswa.
 * Setiap sekolah menyimpan user pada sheet USERS di spreadsheet sekolahnya.
 * MASTER_SEKOLAH tetap menjadi directory untuk menentukan spreadsheet sekolah.
 */
const SCHOOL_USERS_SHEET = 'USERS';

/**
 * Cari user berdasarkan email pada USERS sekolah.
 * Pencarian dilakukan pada sekolah yang ACTIVE di MASTER_SEKOLAH.
 */
function findUserByEmail_(email) {
  const targetEmail = clean_(email).toLowerCase();
  if (!targetEmail) return null;

  const schools = readSheetObjects_(getMasterSpreadsheet_(), MASTER.SEKOLAH)
    .filter(function(row) {
      return clean_(row.status).toUpperCase() === APP_CONFIG.STATUS.ACTIVE;
    });

  for (let i = 0; i < schools.length; i++) {
    const school = schools[i];
    const user = findUserInSchool_(school, targetEmail);
    if (user) return user;
  }

  return null;
}

/**
 * Baca USERS pada satu sekolah.
 * Header USERS dibuat fleksibel karena format data sekolah bisa berbeda.
 */
function findUserInSchool_(school, targetEmail) {
  const spreadsheetId = clean_(school && school.spreadsheet_id);
  if (!spreadsheetId) return null;

  let ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (e) {
    return null;
  }

  const sheet = ss.getSheetByName(SCHOOL_USERS_SHEET);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return null;

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) {
    return normalizeHeader_(value);
  });

  const emailIndex = findHeaderIndex_(headers, [
    'email', 'email_user', 'email pengguna', 'akun', 'username'
  ]);
  if (emailIndex < 0) return null;

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const rowEmail = clean_(row[emailIndex]).toLowerCase();
    if (!rowEmail || rowEmail !== targetEmail) continue;

    const obj = rowToObject_(headers, row);
    const role = normalizeUserRole_(firstValue_(obj, [
      'role', 'kode_role', 'jenis_user', 'jenis pengguna', 'tipe_user', 'tipe pengguna'
    ]));
    const status = normalizeUserStatus_(firstValue_(obj, [
      'status', 'status_user', 'aktif', 'active'
    ]));

    if (status && status !== APP_CONFIG.STATUS.ACTIVE) return null;

    return {
      id_user: firstValue_(obj, ['id_user', 'id', 'nip', 'nisn', 'username']) || '',
      nama: firstValue_(obj, ['nama', 'nama_user', 'nama_lengkap', 'name']) || '',
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

/**
 * Ambil semua user dari satu sekolah untuk kebutuhan OWNER / administrasi.
 */
function getSchoolUsers_(school) {
  const spreadsheetId = clean_(school && school.spreadsheet_id);
  if (!spreadsheetId) return [];

  let ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (e) {
    return [];
  }

  const sheet = ss.getSheetByName(SCHOOL_USERS_SHEET);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) {
    return normalizeHeader_(value);
  });
  const emailIndex = findHeaderIndex_(headers, [
    'email', 'email_user', 'email pengguna', 'akun', 'username'
  ]);
  if (emailIndex < 0) return [];

  return values.slice(1).map(function(row, index) {
    const obj = rowToObject_(headers, row);
    const email = clean_(row[emailIndex]).toLowerCase();
    if (!email) return null;

    const role = normalizeUserRole_(firstValue_(obj, [
      'role', 'kode_role', 'jenis_user', 'jenis pengguna', 'tipe_user', 'tipe pengguna'
    ]));
    const status = normalizeUserStatus_(firstValue_(obj, [
      'status', 'status_user', 'aktif', 'active'
    ]));

    return {
      _row: index + 2,
      id_user: firstValue_(obj, ['id_user', 'id', 'nip', 'nisn', 'username']) || '',
      nama: firstValue_(obj, ['nama', 'nama_user', 'nama_lengkap', 'name']) || '',
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

/**
 * OWNER: seluruh user dari USERS semua sekolah ACTIVE.
 * Data hanya dibaca, bukan ditulis ke MASTER_USER.
 */
function getAllSchoolUsers_() {
  requireMasterOwner_();
  const schools = readSheetObjects_(getMasterSpreadsheet_(), MASTER.SEKOLAH)
    .filter(function(row) {
      return clean_(row.status).toUpperCase() === APP_CONFIG.STATUS.ACTIVE;
    });

  const result = [];
  schools.forEach(function(school) {
    getSchoolUsers_(school).forEach(function(user) {
      result.push(user);
    });
  });
  return result;
}

function normalizeHeader_(value) {
  return clean_(value).toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function findHeaderIndex_(headers, candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const target = normalizeHeader_(candidates[i]);
    const index = headers.indexOf(target);
    if (index >= 0) return index;
  }
  return -1;
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach(function(header, index) {
    if (header) obj[header] = row[index];
  });
  return obj;
}

function firstValue_(obj, keys) {
  for (let i = 0; i < keys.length; i++) {
    const key = normalizeHeader_(keys[i]);
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = clean_(obj[key]);
      if (value) return value;
    }
  }
  return '';
}

function normalizeUserRole_(value) {
  const raw = clean_(value).toUpperCase();
  if (!raw) return '';
  if (raw === 'GURU' || raw === 'TEACHER') return APP_CONFIG.ROLE.GURU;
  if (raw === 'WALI KELAS' || raw === 'WALI_KELAS' || raw === 'WALIKELAS') return APP_CONFIG.ROLE.WALI_KELAS;
  if (raw === 'KARYAWAN' || raw === 'STAFF' || raw === 'TENAGA KEPENDIDIKAN') return APP_CONFIG.ROLE.KARYAWAN;
  if (raw === 'SISWA' || raw === 'STUDENT' || raw === 'MURID') return APP_CONFIG.ROLE.SISWA;
  if (raw === 'ADMIN' || raw === 'ADMIN SEKOLAH' || raw === 'ADMIN_SEKOLAH') return APP_CONFIG.ROLE.ADMIN_SEKOLAH;
  return raw;
}

function normalizeUserStatus_(value) {
  const raw = clean_(value).toUpperCase();
  if (!raw) return '';
  if (['TRUE', 'YA', 'YES', 'AKTIF', 'ACTIVE', '1'].indexOf(raw) >= 0) return APP_CONFIG.STATUS.ACTIVE;
  if (['FALSE', 'TIDAK', 'NO', 'NONAKTIF', 'INACTIVE', '0'].indexOf(raw) >= 0) return APP_CONFIG.STATUS.INACTIVE;
  return raw;
}
