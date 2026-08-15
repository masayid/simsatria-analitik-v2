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

/** Memastikan pemanggil adalah ADMIN_SEKOLAH berdasarkan MASTER_USER. */
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

/**
 * Buat USERS bila belum ada. Admin sekolah selalu dipastikan tersedia dari MASTER_USER.
 * Fungsi aman dijalankan berulang kali (idempotent).
 */
function ensureSchoolUsersSheet_(spreadsheet, masterUser) {
  let sheet = spreadsheet.getSheetByName(SCHOOL_USERS_SHEET);
  const created = !sheet;

  if (!sheet) sheet = spreadsheet.insertSheet(SCHOOL_USERS_SHEET);

  const lastColumn = Math.max(sheet.getLastColumn(), SCHOOL_USERS_HEADERS.length);
  const currentHeaders = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    : [];

  const matches = SCHOOL_USERS_HEADERS.every(function(header, index) {
    return normalizeHeader_(currentHeaders[index]) === normalizeHeader_(header);
  });

  if (!matches) {
    // Jangan menghapus data USERS lama. Jika kosong, tulis header standar.
    const hasData = sheet.getLastRow() > 1 || sheet.getDataRange().getValues().some(function(row) {
      return row.some(function(v) { return clean_(v) !== ''; });
    });
    if (!hasData) {
      sheet.clear();
      sheet.getRange(1, 1, 1, SCHOOL_USERS_HEADERS.length).setValues([SCHOOL_USERS_HEADERS]);
    } else {
      // Jika ada header lama, gunakan header tersebut agar data tidak rusak.
      // Kolom standar hanya ditambahkan bila belum tersedia.
      const headers = currentHeaders.map(clean_);
      SCHOOL_USERS_HEADERS.forEach(function(header) {
        if (headers.map(normalizeHeader_).indexOf(normalizeHeader_(header)) < 0) {
          sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        }
      });
    }
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, SCHOOL_USERS_HEADERS.length).setValues([SCHOOL_USERS_HEADERS]);
  }

  const headersNow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(clean_);
  const emailCol = findHeaderIndex_(headersNow.map(normalizeHeader_), ['email','email_user','email pengguna','akun','username']);
  const roleCol = findHeaderIndex_(headersNow.map(normalizeHeader_), ['role','kode_role','jenis_user','jenis pengguna','tipe_user']);
  const idCol = findHeaderIndex_(headersNow.map(normalizeHeader_), ['id_user','id','nip','nisn','username']);

  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues() : [];
  const adminEmail = clean_(masterUser.email).toLowerCase();
  const adminExists = rows.some(function(row) {
    return emailCol >= 0 && clean_(row[emailCol]).toLowerCase() === adminEmail &&
      roleCol >= 0 && clean_(row[roleCol]).toUpperCase() === APP_CONFIG.ROLE.ADMIN_SEKOLAH;
  });

  if (!adminExists) {
    const newRow = new Array(sheet.getLastColumn()).fill('');
    if (idCol >= 0) newRow[idCol] = clean_(masterUser.id_user);
    const nameCol = findHeaderIndex_(headersNow.map(normalizeHeader_), ['nama','nama_user','nama_lengkap','name']);
    if (nameCol >= 0) newRow[nameCol] = clean_(masterUser.nama);
    if (emailCol >= 0) newRow[emailCol] = adminEmail;
    if (roleCol >= 0) newRow[roleCol] = APP_CONFIG.ROLE.ADMIN_SEKOLAH;
    const statusCol = findHeaderIndex_(headersNow.map(normalizeHeader_), ['status','status_user','aktif','active']);
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
    return {
      _row: index + 2,
      id_user: id,
      nama: nama,
      email: email,
      role: roleCol >= 0 ? clean_(row[roleCol]).toUpperCase() : '',
      status: statusCol >= 0 ? (normalizeUserStatus_(row[statusCol]) || APP_CONFIG.STATUS.ACTIVE) : APP_CONFIG.STATUS.ACTIVE
    };
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

  const idCol = findHeaderIndex_(headers, ['id_user','id','nip','nisn','username']);
  const nameCol = findHeaderIndex_(headers, ['nama','nama_user','nama_lengkap','name']);
  const emailCol = findHeaderIndex_(headers, ['email','email_user','email pengguna','akun','username']);
  const roleCol = findHeaderIndex_(headers, ['role','kode_role','jenis_user','jenis pengguna','tipe_user']);
  const statusCol = findHeaderIndex_(headers, ['status','status_user','aktif','active']);

  if (idCol < 0 || nameCol < 0 || emailCol < 0 || roleCol < 0 || statusCol < 0) {
    throw new Error('Header USERS harus memiliki id_user, nama, email, role, status.');
  }

  const id = clean_(payload.id_user);
  const nama = clean_(payload.nama);
  const email = clean_(payload.email).toLowerCase();
  const role = normalizeUserRole_(payload.role);
  const status = normalizeUserStatus_(payload.status) || APP_CONFIG.STATUS.ACTIVE;
  const rowNumber = Number(payload._row || 0);

  if (!id || !nama || !email) throw new Error('ID user, nama, dan email wajib diisi.');
  if (!email.includes('@')) throw new Error('Format email tidak valid.');
  if (!role || [APP_CONFIG.ROLE.ADMIN_SEKOLAH, APP_CONFIG.ROLE.GURU, APP_CONFIG.ROLE.WALI_KELAS, APP_CONFIG.ROLE.KARYAWAN, APP_CONFIG.ROLE.SISWA].indexOf(role) < 0) throw new Error('Role user tidak valid.');

  const activeEmail = admin.masterUser.email.toLowerCase();
  const isSelf = email === activeEmail;
  if (isSelf && role !== APP_CONFIG.ROLE.ADMIN_SEKOLAH) throw new Error('Role ADMIN_SEKOLAH milik akun administrator tidak boleh diubah.');
  if (isSelf && status !== APP_CONFIG.STATUS.ACTIVE) throw new Error('Akun administrator yang sedang digunakan tidak boleh dinonaktifkan.');

  for (let r = 1; r < values.length; r++) {
    if (rowNumber && r + 1 === rowNumber) continue;
    const existingEmail = clean_(values[r][emailCol]).toLowerCase();
    const existingId = clean_(values[r][idCol]);
    if (existingEmail === email) throw new Error('Email user sudah terdaftar di USERS sekolah.');
    if (existingId === id) throw new Error('ID user sudah terdaftar di USERS sekolah.');
  }

  const row = rowNumber >= 2 && rowNumber <= sheet.getLastRow()
    ? sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0]
    : new Array(sheet.getLastColumn()).fill('');
  row[idCol] = id;
  row[nameCol] = nama;
  row[emailCol] = email;
  row[roleCol] = role;
  row[statusCol] = status;
  const targetRow = rowNumber >= 2 && rowNumber <= sheet.getLastRow() ? rowNumber : sheet.getLastRow() + 1;
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);

  return ok_({ row: targetRow, users: readSchoolUsersForAdmin_(spreadsheet) }, 'User sekolah berhasil disimpan.');
}

function deleteAdminSchoolUser(rowNumber) {
  const admin = requireAdminSekolah_();
  const spreadsheet = SpreadsheetApp.openById(admin.school.spreadsheet_id);
  ensureSchoolUsersSheet_(spreadsheet, admin.masterUser);
  const sheet = spreadsheet.getSheetByName(SCHOOL_USERS_SHEET);
  const row = Number(rowNumber);
  if (row < 2 || row > sheet.getLastRow()) throw new Error('Baris user tidak valid.');

  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(normalizeHeader_);
  const emailCol = findHeaderIndex_(headers, ['email','email_user','email pengguna','akun','username']);
  const roleCol = findHeaderIndex_(headers, ['role','kode_role','jenis_user','jenis pengguna','tipe_user']);
  const email = emailCol >= 0 ? clean_(values[emailCol]).toLowerCase() : '';
  const role = roleCol >= 0 ? clean_(values[roleCol]).toUpperCase() : '';

  if (email === admin.masterUser.email.toLowerCase() || role === APP_CONFIG.ROLE.ADMIN_SEKOLAH) {
    throw new Error('ADMIN_SEKOLAH tidak dapat dihapus dari USERS. Akun admin bersumber dari MASTER_USER.');
  }

  sheet.deleteRow(row);
  return ok_(readSchoolUsersForAdmin_(spreadsheet), 'User sekolah berhasil dihapus.');
}

function ensureAdminSchoolUsersSheet() {
  const admin = requireAdminSekolah_();
  const spreadsheet = SpreadsheetApp.openById(admin.school.spreadsheet_id);
  return ok_(ensureSchoolUsersSheet_(spreadsheet, admin.masterUser), 'Sheet USERS berhasil diperiksa/dibuat.');
}
