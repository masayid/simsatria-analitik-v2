/**
 * SIM SATRIA Multi Sekolah — SETUP RUNNER
 *
 * Operator cukup memilih fungsi setup01 s.d. setup10 dari dropdown
 * Run pada Apps Script Editor. Jangan menjalankan fungsi internal `_`.
 *
 * Isi SETUP_CONFIG terlebih dahulu.
 */

const SETUP_CONFIG = {
  MASTER_SPREADSHEET_ID: 'GANTI_DENGAN_ID_SPREADSHEET_MASTER',
  SETUP_OWNER_EMAIL: 'GANTI_DENGAN_EMAIL_OPERATOR_MASTER',

  SEKOLAH: {
    id_sekolah: 'SMANDA2SKJ',
    npsn: '20306175',
    nama_sekolah: 'SMA Negeri 2 Sukorejo',
    spreadsheet_id: 'GANTI_DENGAN_ID_SPREADSHEET_SEKOLAH',
    drive_folder_id: 'GANTI_DENGAN_ID_FOLDER_DRIVE_SEKOLAH'
  },

  ADMIN: {
    id_user: 'U001',
    nama: 'Administrator Sekolah',
    email: 'GANTI_DENGAN_EMAIL_ADMIN_SEKOLAH'
  },

  TEST_USERS: [
    { id_user: 'U002', nama: 'Guru Contoh', email: 'GANTI_DENGAN_EMAIL_GURU', role: 'GURU' },
    { id_user: 'U003', nama: 'Wali Kelas Contoh', email: 'GANTI_DENGAN_EMAIL_WALI_KELAS', role: 'WALI_KELAS' },
    { id_user: 'U004', nama: 'Karyawan Contoh', email: 'GANTI_DENGAN_EMAIL_KARYAWAN', role: 'KARYAWAN' },
    { id_user: 'U005', nama: 'Siswa Contoh', email: 'GANTI_DENGAN_EMAIL_SISWA', role: 'SISWA' }
  ],

  MENU_UJI: {
    kode_menu: 'AGENDA_GURU',
    nama_menu: 'Agenda Mengajar',
    parent_id: '',
    urutan: 10,
    icon: 'calendar'
  }
};

/** 01 — Simpan ID Spreadsheet MASTER ke Script Properties. */
function setup01_setMasterSpreadsheet() {
  requireSetupValue_(SETUP_CONFIG.MASTER_SPREADSHEET_ID, 'MASTER_SPREADSHEET_ID');
  return setMasterSpreadsheetId_(SETUP_CONFIG.MASTER_SPREADSHEET_ID);
}

/** 02 — Simpan email operator MASTER ke Script Properties. */
function setup02_setSetupOwner() {
  requireSetupValue_(SETUP_CONFIG.SETUP_OWNER_EMAIL, 'SETUP_OWNER_EMAIL');
  return setSetupOwnerEmail_(SETUP_CONFIG.SETUP_OWNER_EMAIL);
}

/** 03 — Periksa konfigurasi setup. */
function setup03_checkSetup() {
  const result = getSetupStatus();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/** 04 — Buat seluruh MASTER_* dan seed data awal. */
function setup04_initializeSystem() {
  const result = initializeSystem_();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/** 05 — Daftarkan sekolah pertama ke MASTER_SEKOLAH. */
function setup05_registerSchool() {
  const s = SETUP_CONFIG.SEKOLAH;
  ['id_sekolah', 'npsn', 'nama_sekolah', 'spreadsheet_id', 'drive_folder_id']
    .forEach(k => requireSetupValue_(s[k], k));
  const result = registerSchool(s);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/** 06 — Daftarkan ADMIN_SEKOLAH pertama. */
function setup06_registerAdmin() {
  const a = SETUP_CONFIG.ADMIN;
  requireSetupValue_(a.email, 'EMAIL_ADMIN_SEKOLAH');
  const result = registerUser({
    id_user: a.id_user,
    id_sekolah: SETUP_CONFIG.SEKOLAH.id_sekolah,
    nama: a.nama,
    email: a.email,
    role: 'ADMIN_SEKOLAH'
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/** 07 — Daftarkan user contoh GURU/WALI_KELAS/KARYAWAN/SISWA. */
function setup07_registerTestUsers() {
  const results = [];
  SETUP_CONFIG.TEST_USERS.forEach(u => {
    if (!u.email || u.email.indexOf('GANTI_DENGAN_') === 0) {
      results.push({ id_user: u.id_user, role: u.role, status: 'SKIPPED', message: 'Email belum diisi.' });
      return;
    }
    try {
      results.push({
        id_user: u.id_user,
        role: u.role,
        status: 'REGISTERED',
        result: registerUser({
          id_user: u.id_user,
          id_sekolah: SETUP_CONFIG.SEKOLAH.id_sekolah,
          nama: u.nama,
          email: u.email,
          role: u.role
        })
      });
    } catch (err) {
      results.push({ id_user: u.id_user, role: u.role, status: 'ERROR', message: err.message });
    }
  });
  Logger.log(JSON.stringify(results, null, 2));
  return results;
}

/** 08 — Tambahkan menu uji Agenda Mengajar. */
function setup08_addMenu() {
  const result = addMenu(SETUP_CONFIG.MENU_UJI);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/** 09 — Berikan permission uji kepada role. */
function setup09_grantTestPermissions() {
  const menu = SETUP_CONFIG.MENU_UJI.kode_menu;
  const roles = {
    ADMIN_SEKOLAH: ['READ', 'INPUT', 'UPLOAD', 'PDF', 'ADMIN'],
    GURU: ['READ', 'INPUT', 'UPLOAD', 'PDF'],
    WALI_KELAS: ['READ', 'INPUT', 'UPLOAD', 'PDF'],
    KARYAWAN: ['READ', 'INPUT', 'UPLOAD', 'PDF']
  };
  const results = Object.keys(roles).map(role => ({
    role: role,
    result: grantMenuPermission(role, menu, roles[role])
  }));
  Logger.log(JSON.stringify(results, null, 2));
  return results;
}

/** 10 — Pemeriksaan akhir seluruh MASTER. */
function setup10_checkMaster() {
  const result = {
    setup: getSetupStatus(),
    system: getSystemStatus(),
    summary: getMasterSummary(),
    schools: listMasterSchools(),
    users: listMasterUsers(SETUP_CONFIG.SEKOLAH.id_sekolah),
    menus: listMasterMenus(),
    guruPermissions: listRolePermissions('GURU'),
    adminPermissions: listRolePermissions('ADMIN_SEKOLAH')
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function requireSetupValue_(value, label) {
  if (!value || String(value).indexOf('GANTI_DENGAN_') === 0) {
    throw new Error(label + ' belum diisi pada SETUP_CONFIG di Setup.js.');
  }
}
