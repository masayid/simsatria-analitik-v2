/**
 * SHARED DIRECTORY KARYAWAN
 *
 * Dipakai modul operasional sekolah: Monitoring Kerja, Kebersihan,
 * Keamanan, Parkir, dan modul lain yang membutuhkan daftar KARYAWAN.
 * Fungsi ini READ-ONLY dan tidak mensyaratkan role ADMIN_SEKOLAH.
 */
function getKaryawanDirectoryForApp() {
  const session = getSessionContext();
  if (!session || session.ok !== true || !session.data || !session.data.school) {
    throw new Error('Sesi sekolah tidak tersedia.');
  }

  const school = session.data.school;
  const spreadsheetId = clean_(school.spreadsheetId || school.spreadsheet_id);
  if (!spreadsheetId) throw new Error('Spreadsheet sekolah belum dikonfigurasi.');

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName('KARYAWAN');
  if (!sheet || sheet.getLastRow() < 2) return ok_([], 'Directory KARYAWAN kosong.');

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(function(v) { return clean_(v).toUpperCase(); });
  const required = ['ID_KARYAWAN','NIP','NAMA','BIDANG_TUGAS','STATUS','IJAZAH'];
  const index = {};
  required.forEach(function(h) { index[h] = headers.indexOf(h); });
  const missing = required.filter(function(h) { return index[h] < 0; });
  if (missing.length) throw new Error('Header KARYAWAN tidak lengkap: ' + missing.join(', '));

  const rows = values.slice(1).filter(function(row) {
    return row.some(function(v) { return clean_(v) !== ''; });
  }).map(function(row) {
    return {
      ID_KARYAWAN: clean_(row[index.ID_KARYAWAN]),
      NIP: clean_(row[index.NIP]),
      NAMA: clean_(row[index.NAMA]),
      BIDANG_TUGAS: clean_(row[index.BIDANG_TUGAS]),
      STATUS: clean_(row[index.STATUS]).toUpperCase() || 'ACTIVE',
      IJAZAH: clean_(row[index.IJAZAH])
    };
  }).filter(function(row) {
    return row.STATUS !== 'INACTIVE';
  });

  return ok_(rows, 'Directory KARYAWAN berhasil dimuat.');
}

// Alias yang sengaja disediakan agar modul operasional mudah memakai master yang sama.
function getKaryawanListForApp() {
  return getKaryawanDirectoryForApp();
}

function getKaryawanSekolahForApp() {
  return getKaryawanDirectoryForApp();
}
