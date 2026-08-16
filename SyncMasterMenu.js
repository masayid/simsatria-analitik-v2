/**
 * SIM SATRIA — MASTER MENU SYNC
 *
 * Menjaga MASTER_MENU sebagai registry menu yang sinkron dengan menu
 * Administrasi Sekolah yang digunakan Web App.
 * Jalankan syncMasterMenuRegistry() setelah perubahan struktur menu.
 */

const MASTER_MENU_SYNC_DEFINITIONS = [
  {kode_menu:'DASHBOARD', nama_menu:'Dashboard', parent_id:'', urutan:1, icon:'DASHBOARD', aktif:'TRUE'},
  {kode_menu:'ADMIN_SEKOLAH', nama_menu:'Admin Sekolah', parent_id:'', urutan:100, icon:'SETTINGS', aktif:'TRUE'},
  {kode_menu:'ADMIN_KEPALA_SEKOLAH', nama_menu:'Kepala Sekolah', parent_id:'', urutan:101, icon:'KEPALA_SEKOLAH', aktif:'TRUE'},
  {kode_menu:'ADMIN_KELAS', nama_menu:'Kelola Kelas', parent_id:'', urutan:102, icon:'KELAS', aktif:'TRUE'},
  {kode_menu:'ADMIN_GURU', nama_menu:'Kelola Guru', parent_id:'', urutan:103, icon:'GURU', aktif:'TRUE'},
  {kode_menu:'ADMIN_KARYAWAN', nama_menu:'Kelola Karyawan', parent_id:'', urutan:104, icon:'KARYAWAN', aktif:'TRUE'},
  {kode_menu:'ADMIN_SISWA', nama_menu:'Kelola Siswa', parent_id:'', urutan:105, icon:'SISWA', aktif:'TRUE'}
];

/**
 * Sinkronkan registry MASTER_MENU tanpa menghapus menu lain yang sudah ada.
 * Hanya menu yang didefinisikan di atas yang dinormalisasi.
 */
function syncMasterMenuRegistry() {
  requireSetupAccess_();

  const ss = getMasterSpreadsheet_();
  const sh = ss.getSheetByName(MASTER.MENU);
  if (!sh) throw new Error('MASTER_MENU belum tersedia. Jalankan initializeSystem_() terlebih dahulu.');

  const headers = MASTER_HEADERS[MASTER.MENU];
  const values = sh.getDataRange().getValues();
  const headerRow = values[0].map(clean_);
  const index = {};
  headerRow.forEach(function(h, i) { index[h] = i; });

  ['kode_menu','nama_menu','parent_id','urutan','icon','aktif'].forEach(function(h) {
    if (index[h] == null) throw new Error('Header MASTER_MENU tidak lengkap: ' + h);
  });

  const rowByCode = {};
  for (let r = 1; r < values.length; r++) {
    const code = clean_(values[r][index.kode_menu]).toUpperCase();
    if (code) rowByCode[code] = r + 1;
  }

  const added = [];
  const updated = [];

  MASTER_MENU_SYNC_DEFINITIONS.forEach(function(def) {
    const code = def.kode_menu.toUpperCase();
    const existingRow = rowByCode[code];
    const rowValues = [
      code,
      def.nama_menu,
      def.parent_id,
      def.urutan,
      def.icon,
      def.aktif
    ];

    if (existingRow) {
      sh.getRange(existingRow, 1, 1, headers.length).setValues([rowValues]);
      updated.push(code);
    } else {
      sh.getRange(sh.getLastRow() + 1, 1, 1, headers.length).setValues([rowValues]);
      added.push(code);
    }
  });

  /* ADMIN_SEKOLAH memperoleh seluruh hak administrasi pada enam menu sekolah. */
  const adminMenus = MASTER_MENU_SYNC_DEFINITIONS
    .filter(function(m) { return m.kode_menu.indexOf('ADMIN_') === 0; })
    .map(function(m) { return m.kode_menu; });

  adminMenus.forEach(function(menuCode) {
    grantMenuPermission('ADMIN_SEKOLAH', menuCode, ['READ','INPUT','UPLOAD','PDF','ADMIN']);
  });

  return ok_({
    added: added,
    updated: updated,
    adminMenus: adminMenus
  }, 'MASTER_MENU berhasil disinkronkan dengan menu Administrasi Sekolah.');
}

function getMasterMenuRegistry() {
  requireSetupAccess_();
  return readSheetObjects_(getMasterSpreadsheet_(), MASTER.MENU)
    .filter(function(row) { return clean_(row.aktif).toUpperCase() !== 'FALSE'; })
    .sort(function(a,b) { return Number(a.urutan || 0) - Number(b.urutan || 0); });
}
