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

/* =====================================================================
 * SHARED DIRECTORY SISWA — ADMIN_SEKOLAH + MODUL OPERASIONAL
 * Sheet SISWA berada di spreadsheet sekolah masing-masing.
 * Header resmi: KELAS, NAMA, NISN, NIS, JK, STATUS.
 * ===================================================================== */
const SCHOOL_SISWA_SHEET = 'SISWA';
const SCHOOL_SISWA_HEADERS = Object.freeze(['KELAS','NAMA','NISN','NIS','JK','STATUS']);

function ensureAdminSchoolSiswaSheet_() {
  requireAdminSekolah_();
  return gatewayCall_('SPREADSHEET_ENSURE_SHEET', {
    sheet: SCHOOL_SISWA_SHEET,
    headers: SCHOOL_SISWA_HEADERS.slice()
  });
}

function readAdminSchoolSiswa_() {
  const result = readSheetViaGateway(SCHOOL_SISWA_SHEET);
  const data = result && result.data ? result.data : result;
  const values = data && Array.isArray(data.values) ? data.values : [];
  if (values.length < 2) return [];

  const headers = values[0].map(function(v) { return clean_(v).toUpperCase(); });
  const index = {};
  SCHOOL_SISWA_HEADERS.forEach(function(header) { index[header] = headers.indexOf(header); });
  const missing = SCHOOL_SISWA_HEADERS.filter(function(header) { return index[header] < 0; });
  if (missing.length) throw new Error('Header SISWA tidak lengkap: ' + missing.join(', '));

  return values.slice(1).map(function(row, i) {
    if (!row.some(function(v) { return clean_(v) !== ''; })) return null;
    return {
      _row: i + 2,
      KELAS: clean_(row[index.KELAS]),
      NAMA: clean_(row[index.NAMA]),
      NISN: clean_(row[index.NISN]),
      NIS: clean_(row[index.NIS]),
      JK: clean_(row[index.JK]).toUpperCase(),
      STATUS: clean_(row[index.STATUS]).toUpperCase() || 'ACTIVE'
    };
  }).filter(Boolean);
}

function getAdminSchoolSiswa() {
  requireAdminSekolah_();
  ensureAdminSchoolSiswaSheet_();
  const rows = readAdminSchoolSiswa_();
  return ok_({
    sheet: SCHOOL_SISWA_SHEET,
    headers: SCHOOL_SISWA_HEADERS.slice(),
    rows: rows,
    total: rows.length,
    perPage: 10
  }, 'Data SISWA berhasil dimuat.');
}

function saveAdminSchoolSiswa(data) {
  requireAdminSekolah_();
  const payload = data || {};
  ensureAdminSchoolSiswaSheet_();

  const kelas = clean_(payload.KELAS);
  const nama = clean_(payload.NAMA);
  const nisn = clean_(payload.NISN);
  const nis = clean_(payload.NIS);
  const jk = clean_(payload.JK).toUpperCase();
  const status = clean_(payload.STATUS).toUpperCase() || 'ACTIVE';
  const rowNumber = Number(payload._row || 0);

  if (!kelas) throw new Error('KELAS wajib diisi.');
  if (!nama) throw new Error('NAMA siswa wajib diisi.');
  if (!nisn && !nis) throw new Error('NISN atau NIS wajib diisi minimal salah satu.');
  if (jk && ['L','P'].indexOf(jk) < 0) throw new Error('JK harus L atau P.');
  if (['ACTIVE','INACTIVE'].indexOf(status) < 0) throw new Error('STATUS harus ACTIVE atau INACTIVE.');

  const rows = readAdminSchoolSiswa_();
  rows.forEach(function(row) {
    if (Number(row._row) === rowNumber) return;
    if (nisn && clean_(row.NISN).toUpperCase() === nisn.toUpperCase()) throw new Error('NISN sudah terdaftar: ' + nisn);
    if (nis && clean_(row.NIS).toUpperCase() === nis.toUpperCase()) throw new Error('NIS sudah terdaftar: ' + nis);
  });

  const row = [kelas, nama, nisn, nis, jk, status];
  if (rowNumber >= 2) {
    gatewayCall_('SPREADSHEET_UPDATE_ROW', {sheet:SCHOOL_SISWA_SHEET, rowNumber:rowNumber, row:row});
  } else {
    gatewayCall_('SPREADSHEET_APPEND', {sheet:SCHOOL_SISWA_SHEET, row:row});
  }
  return getAdminSchoolSiswa();
}

function deleteAdminSchoolSiswa(rowNumber) {
  requireAdminSekolah_();
  ensureAdminSchoolSiswaSheet_();
  const row = Number(rowNumber);
  if (row < 2) throw new Error('Baris SISWA tidak valid.');
  gatewayCall_('SPREADSHEET_DELETE_ROW', {sheet:SCHOOL_SISWA_SHEET, rowNumber:row});
  return getAdminSchoolSiswa();
}

function importAdminSchoolSiswa(rows) {
  requireAdminSekolah_();
  ensureAdminSchoolSiswaSheet_();
  if (!Array.isArray(rows) || !rows.length) throw new Error('Data template SISWA kosong.');
  if (rows.length > 1000) throw new Error('Maksimal 1000 baris per upload template.');

  const existing = readAdminSchoolSiswa_();
  const nisns = {}, nises = {};
  existing.forEach(function(r) {
    if (clean_(r.NISN)) nisns[clean_(r.NISN).toUpperCase()] = true;
    if (clean_(r.NIS)) nises[clean_(r.NIS).toUpperCase()] = true;
  });

  let inserted = 0, skipped = 0, errors = [];
  rows.forEach(function(item, i) {
    const kelas = clean_(item.KELAS);
    const nama = clean_(item.NAMA);
    const nisn = clean_(item.NISN);
    const nis = clean_(item.NIS);
    const jk = clean_(item.JK).toUpperCase();
    const status = clean_(item.STATUS).toUpperCase() || 'ACTIVE';

    if (!kelas || !nama || (!nisn && !nis) || (jk && ['L','P'].indexOf(jk) < 0) || ['ACTIVE','INACTIVE'].indexOf(status) < 0) {
      errors.push('Baris ' + (i + 2) + ': KELAS, NAMA, NISN/NIS wajib; JK L/P; STATUS ACTIVE/INACTIVE.');
      return;
    }
    if (nisn && nisns[nisn.toUpperCase()]) { skipped++; return; }
    if (nis && nises[nis.toUpperCase()]) { skipped++; return; }

    gatewayCall_('SPREADSHEET_APPEND', {sheet:SCHOOL_SISWA_SHEET, row:[kelas,nama,nisn,nis,jk,status]});
    if (nisn) nisns[nisn.toUpperCase()] = true;
    if (nis) nises[nis.toUpperCase()] = true;
    inserted++;
  });

  const result = getAdminSchoolSiswa();
  return ok_({
    inserted: inserted,
    skipped: skipped,
    errors: errors,
    rows: result.data.rows,
    total: result.data.total
  }, 'Template SISWA selesai diproses.');
}

/**
 * Directory bersama untuk PRESENSI KELAS, LITNUM, SMSS, TKA, ASESMEN, dll.
 * Hanya siswa ACTIVE yang dikembalikan.
 */
function getSchoolSiswaDirectory() {
  const session = getSessionContext();
  if (!session || session.ok !== true || !session.data || !session.data.school) {
    throw new Error('Sesi sekolah tidak tersedia.');
  }

  const result = readSheetViaGateway(SCHOOL_SISWA_SHEET);
  const data = result && result.data ? result.data : result;
  const values = data && Array.isArray(data.values) ? data.values : [];
  if (values.length < 2) return ok_([], 'Directory SISWA belum memiliki data.');

  const headers = values[0].map(function(v) { return clean_(v).toUpperCase(); });
  const index = {};
  SCHOOL_SISWA_HEADERS.forEach(function(header) { index[header] = headers.indexOf(header); });
  const missing = SCHOOL_SISWA_HEADERS.filter(function(header) { return index[header] < 0; });
  if (missing.length) throw new Error('Header SISWA tidak lengkap: ' + missing.join(', '));

  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const nama = clean_(values[i][index.NAMA]);
    if (!nama) continue;
    const status = clean_(values[i][index.STATUS]).toUpperCase() || 'ACTIVE';
    if (status === 'INACTIVE') continue;
    rows.push({
      KELAS: clean_(values[i][index.KELAS]),
      NAMA: nama,
      NISN: clean_(values[i][index.NISN]),
      NIS: clean_(values[i][index.NIS]),
      JK: clean_(values[i][index.JK]).toUpperCase(),
      STATUS: status
    });
  }
  return ok_(rows, 'Directory SISWA berhasil dimuat.');
}

function getSiswaDirectoryForApp() {
  return getSchoolSiswaDirectory();
}

function getSiswaListForApp() {
  return getSchoolSiswaDirectory();
}

function getSiswaSekolahForApp() {
  return getSchoolSiswaDirectory();
}
