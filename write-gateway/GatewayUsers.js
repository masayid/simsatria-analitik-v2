/**
 * USER LOOKUP GATEWAY
 *
 * Web App utama berjalan USER_ACCESSING dan tidak boleh membuka Spreadsheet
 * sekolah secara langsung. File ini dijalankan oleh Write Gateway (owner),
 * lalu membaca MASTER_USER / MASTER_SEKOLAH dan USERS sekolah.
 *
 * Aturan sumber:
 * - OWNER: ditangani Web App, bukan USERS.
 * - ADMIN_SEKOLAH: MASTER_USER.
 * - GURU/KARYAWAN/SISWA/WALI_KELAS/dll: USERS sekolah.
 */
function gatewayLookupUserByEmail_(email) {
  const target = gatewayClean_(email).toLowerCase();
  gatewayRequire_(target, 'Email user wajib dikirim.');

  const masterId = PropertiesService.getScriptProperties().getProperty(
    GATEWAY_CONFIG.PROP.MASTER_SPREADSHEET_ID
  );
  gatewayRequire_(masterId, 'MASTER_SPREADSHEET_ID belum dikonfigurasi pada Write Gateway.');

  const master = SpreadsheetApp.openById(masterId);
  const masterUsers = gatewayReadObjects_(master, 'MASTER_USER');
  const masterSchools = gatewayReadObjects_(master, 'MASTER_SEKOLAH');

  // ADMIN_SEKOLAH tetap berasal dari MASTER_USER.
  for (let i = 0; i < masterUsers.length; i++) {
    const row = masterUsers[i];
    const role = gatewayClean_(row.role).toUpperCase();
    const status = gatewayClean_(row.status).toUpperCase();
    if (gatewayClean_(row.email).toLowerCase() !== target) continue;
    if (role !== 'ADMIN_SEKOLAH') continue;
    if (status === 'INACTIVE') return null;

    const schoolId = gatewayClean_(row.id_sekolah).toUpperCase();
    const school = gatewayFindSchoolObject_(masterSchools, schoolId);
    if (!school) throw new Error('Sekolah ADMIN_SEKOLAH tidak ditemukan di MASTER_SEKOLAH.');

    return gatewayUserResult_(row, school, 'MASTER_USER', 'ADMIN_SEKOLAH');
  }

  // User biasa selalu dicari langsung pada USERS masing-masing sekolah.
  for (let i = 0; i < masterSchools.length; i++) {
    const school = masterSchools[i];
    if (gatewayClean_(school.status).toUpperCase() === 'INACTIVE') continue;

    const spreadsheetId = gatewayClean_(school.spreadsheet_id);
    if (!spreadsheetId) continue;

    let ss;
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      // Gateway owner seharusnya memiliki akses. Lewati konfigurasi sekolah
      // yang tidak dapat dibuka agar sekolah lain tetap dapat dicari.
      continue;
    }

    const sheet = ss.getSheetByName('USERS');
    if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) continue;

    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(gatewayNormalizeHeader_);
    const emailIndex = gatewayFindHeaderIndex_(headers, [
      'email', 'email_user', 'email pengguna', 'akun', 'username'
    ]);
    if (emailIndex < 0) continue;

    for (let r = 1; r < values.length; r++) {
      const obj = gatewayRowToObject_(headers, values[r]);
      if (gatewayClean_(values[r][emailIndex]).toLowerCase() !== target) continue;

      const role = gatewayNormalizeRole_(gatewayFirstValue_(obj, [
        'role', 'kode_role', 'jenis_user', 'jenis pengguna', 'tipe_user', 'tipe pengguna'
      ]));
      const status = gatewayNormalizeStatus_(gatewayFirstValue_(obj, [
        'status', 'status_user', 'aktif', 'active'
      ]));

      if (role === 'ADMIN_SEKOLAH') return null;
      if (status === 'INACTIVE') return null;

      return gatewayUserResult_(obj, school, 'USERS', role || 'GURU', status || 'ACTIVE');
    }
  }

  return null;
}

function gatewayUserResult_(row, school, source, roleOverride, statusOverride) {
  return {
    user: {
      id_user: gatewayFirstValue_(row, ['id_user', 'id', 'nip', 'nisn', 'username']),
      nama: gatewayFirstValue_(row, ['nama', 'nama_user', 'nama_lengkap', 'name']),
      email: gatewayFirstValue_(row, ['email', 'email_user', 'email pengguna', 'akun', 'username']).toLowerCase(),
      role: roleOverride || gatewayNormalizeRole_(gatewayFirstValue_(row, ['role', 'kode_role'])),
      status: statusOverride || gatewayNormalizeStatus_(gatewayFirstValue_(row, ['status', 'status_user', 'aktif', 'active']))
    },
    school: {
      id_sekolah: gatewayClean_(school.id_sekolah).toUpperCase(),
      npsn: gatewayClean_(school.npsn),
      nama_sekolah: gatewayClean_(school.nama_sekolah),
      spreadsheet_id: gatewayClean_(school.spreadsheet_id),
      drive_folder_id: gatewayClean_(school.drive_folder_id)
    },
    source: source
  };
}

function gatewayReadObjects_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(gatewayNormalizeHeader_);
  return values.slice(1).map(function(row) {
    return gatewayRowToObject_(headers, row);
  });
}

function gatewayFindSchoolObject_(schools, schoolId) {
  const target = gatewayClean_(schoolId).toUpperCase();
  return schools.find(function(row) {
    return gatewayClean_(row.id_sekolah).toUpperCase() === target &&
      gatewayClean_(row.status).toUpperCase() !== 'INACTIVE';
  }) || null;
}

function gatewayNormalizeHeader_(value) {
  return gatewayClean_(value).toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function gatewayFindHeaderIndex_(headers, candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const index = headers.indexOf(gatewayNormalizeHeader_(candidates[i]));
    if (index >= 0) return index;
  }
  return -1;
}

function gatewayRowToObject_(headers, row) {
  const obj = {};
  headers.forEach(function(header, index) {
    if (header) obj[header] = row[index];
  });
  return obj;
}

function gatewayFirstValue_(obj, keys) {
  for (let i = 0; i < keys.length; i++) {
    const key = gatewayNormalizeHeader_(keys[i]);
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = gatewayClean_(obj[key]);
      if (value) return value;
    }
  }
  return '';
}

function gatewayNormalizeRole_(value) {
  const raw = gatewayClean_(value).toUpperCase();
  if (!raw) return '';
  if (raw === 'GURU' || raw === 'TEACHER') return 'GURU';
  if (['WALI KELAS', 'WALI_KELAS', 'WALIKELAS'].indexOf(raw) >= 0) return 'WALI_KELAS';
  if (['KARYAWAN', 'STAFF', 'TENAGA KEPENDIDIKAN'].indexOf(raw) >= 0) return 'KARYAWAN';
  if (['SISWA', 'STUDENT', 'MURID'].indexOf(raw) >= 0) return 'SISWA';
  if (['ADMIN', 'ADMIN SEKOLAH', 'ADMIN_SEKOLAH'].indexOf(raw) >= 0) return 'ADMIN_SEKOLAH';
  return raw;
}

function gatewayNormalizeStatus_(value) {
  const raw = gatewayClean_(value).toUpperCase();
  if (!raw) return '';
  if (['TRUE', 'YA', 'YES', 'AKTIF', 'ACTIVE', '1'].indexOf(raw) >= 0) return 'ACTIVE';
  if (['FALSE', 'TIDAK', 'NO', 'NONAKTIF', 'INACTIVE', '0'].indexOf(raw) >= 0) return 'INACTIVE';
  return raw;
}
