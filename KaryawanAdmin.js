/**
 * SIM SATRIA — ADMIN SEKOLAH / MASTER KARYAWAN
 *
 * Sumber data: spreadsheet milik sekolah yang sedang aktif.
 * Sheet KARYAWAN dibuat otomatis bila belum tersedia.
 * Directory ini dipakai bersama oleh Monitoring Kerja, Kebersihan,
 * Keamanan, Parkir, dan modul lain yang membutuhkan data karyawan.
 */

const SCHOOL_KARYAWAN_SHEET = 'KARYAWAN';
const SCHOOL_KARYAWAN_HEADERS = Object.freeze([
  'ID_KARYAWAN',
  'NIP',
  'NAMA',
  'BIDANG_TUGAS',
  'STATUS',
  'IJAZAH'
]);

function ensureAdminSchoolKaryawanSheet_() {
  requireAdminSekolah_();
  return gatewayCall_('SPREADSHEET_ENSURE_SHEET', {
    sheet: SCHOOL_KARYAWAN_SHEET,
    headers: SCHOOL_KARYAWAN_HEADERS.slice()
  });
}

function getAdminSchoolKaryawan() {
  requireAdminSekolah_();
  ensureAdminSchoolKaryawanSheet_();

  const result = readSheetViaGateway(SCHOOL_KARYAWAN_SHEET);
  const data = result && result.data ? result.data : result;
  const values = data && Array.isArray(data.values) ? data.values : [];

  if (values.length < 2) {
    return ok_({
      sheet: SCHOOL_KARYAWAN_SHEET,
      headers: SCHOOL_KARYAWAN_HEADERS.slice(),
      rows: [],
      total: 0
    }, 'Sheet KARYAWAN siap digunakan dan belum memiliki data.');
  }

  const headers = values[0].map(function(v) { return clean_(v).toUpperCase(); });
  const index = {};
  SCHOOL_KARYAWAN_HEADERS.forEach(function(header) { index[header] = headers.indexOf(header); });
  const missing = SCHOOL_KARYAWAN_HEADERS.filter(function(header) { return index[header] < 0; });
  if (missing.length) throw new Error('Header KARYAWAN tidak lengkap: ' + missing.join(', '));

  const rows = values.slice(1).map(function(row, i) {
    if (!row.some(function(v) { return clean_(v) !== ''; })) return null;
    return {
      _row: i + 2,
      ID_KARYAWAN: clean_(row[index.ID_KARYAWAN]),
      NIP: clean_(row[index.NIP]),
      NAMA: clean_(row[index.NAMA]),
      BIDANG_TUGAS: clean_(row[index.BIDANG_TUGAS]),
      STATUS: clean_(row[index.STATUS]).toUpperCase() || APP_CONFIG.STATUS.ACTIVE,
      IJAZAH: clean_(row[index.IJAZAH])
    };
  }).filter(Boolean);

  return ok_({
    sheet: SCHOOL_KARYAWAN_SHEET,
    headers: SCHOOL_KARYAWAN_HEADERS.slice(),
    rows: rows,
    total: rows.length
  }, 'Data KARYAWAN berhasil dimuat.');
}

function saveAdminSchoolKaryawan(data) {
  requireAdminSekolah_();
  const payload = data || {};
  ensureAdminSchoolKaryawanSheet_();

  const id = clean_(payload.ID_KARYAWAN);
  const nip = clean_(payload.NIP);
  const nama = clean_(payload.NAMA);
  const bidang = clean_(payload.BIDANG_TUGAS);
  const status = clean_(payload.STATUS).toUpperCase() || APP_CONFIG.STATUS.ACTIVE;
  const ijazah = clean_(payload.IJAZAH);
  const rowNumber = Number(payload._row || 0);

  if (!id) throw new Error('ID_KARYAWAN wajib diisi.');
  if (!nama) throw new Error('NAMA wajib diisi.');
  if (!bidang) throw new Error('BIDANG_TUGAS wajib diisi.');
  if ([APP_CONFIG.STATUS.ACTIVE, APP_CONFIG.STATUS.INACTIVE].indexOf(status) < 0) {
    throw new Error('STATUS harus ACTIVE atau INACTIVE.');
  }

  const currentResult = readSheetViaGateway(SCHOOL_KARYAWAN_SHEET);
  const currentData = currentResult && currentResult.data ? currentResult.data : currentResult;
  const values = currentData && Array.isArray(currentData.values) ? currentData.values : [];
  const headers = values.length
    ? values[0].map(function(v) { return clean_(v).toUpperCase(); })
    : SCHOOL_KARYAWAN_HEADERS.slice();

  const idxId = headers.indexOf('ID_KARYAWAN');
  const idxNip = headers.indexOf('NIP');
  if (idxId < 0 || idxNip < 0) throw new Error('Header KARYAWAN tidak lengkap.');

  for (let i = 1; i < values.length; i++) {
    const existingRow = i + 1;
    if (rowNumber && existingRow === rowNumber) continue;
    if (clean_(values[i][idxId]).toUpperCase() === id.toUpperCase()) {
      throw new Error('ID_KARYAWAN sudah terdaftar: ' + id);
    }
    if (nip && clean_(values[i][idxNip]) && clean_(values[i][idxNip]) === nip) {
      throw new Error('NIP sudah terdaftar: ' + nip);
    }
  }

  const row = [id, nip, nama, bidang, status, ijazah];
  if (rowNumber >= 2) {
    gatewayCall_('SPREADSHEET_UPDATE_ROW', {
      sheet: SCHOOL_KARYAWAN_SHEET,
      rowNumber: rowNumber,
      row: row
    });
  } else {
    gatewayCall_('SPREADSHEET_APPEND', {
      sheet: SCHOOL_KARYAWAN_SHEET,
      row: row
    });
  }

  return getAdminSchoolKaryawan();
}

function deleteAdminSchoolKaryawan(rowNumber) {
  requireAdminSekolah_();
  ensureAdminSchoolKaryawanSheet_();
  const row = Number(rowNumber);
  if (!(row >= 2)) throw new Error('Baris KARYAWAN tidak valid.');
  gatewayCall_('SPREADSHEET_DELETE_ROW', {
    sheet: SCHOOL_KARYAWAN_SHEET,
    rowNumber: row
  });
  return getAdminSchoolKaryawan();
}

function importAdminSchoolKaryawan(rows) {
  requireAdminSekolah_();
  ensureAdminSchoolKaryawanSheet_();

  if (!Array.isArray(rows) || !rows.length) throw new Error('Data template KARYAWAN kosong.');
  if (rows.length > 1000) throw new Error('Maksimal 1.000 baris per upload template.');

  const currentResult = readSheetViaGateway(SCHOOL_KARYAWAN_SHEET);
  const currentData = currentResult && currentResult.data ? currentResult.data : currentResult;
  const values = currentData && Array.isArray(currentData.values) ? currentData.values : [];
  const existingIds = new Set();
  const existingNips = new Set();

  if (values.length) {
    const headers = values[0].map(function(v) { return clean_(v).toUpperCase(); });
    const idCol = headers.indexOf('ID_KARYAWAN');
    const nipCol = headers.indexOf('NIP');
    for (let i = 1; i < values.length; i++) {
      if (idCol >= 0 && clean_(values[i][idCol])) existingIds.add(clean_(values[i][idCol]).toUpperCase());
      if (nipCol >= 0 && clean_(values[i][nipCol])) existingNips.add(clean_(values[i][nipCol]));
    }
  }

  const batchIds = new Set();
  const batchNips = new Set();
  let inserted = 0;
  let skipped = 0;
  const errors = [];

  rows.forEach(function(item, index) {
    const line = index + 2;
    const id = clean_(item && item.ID_KARYAWAN);
    const nip = clean_(item && item.NIP);
    const nama = clean_(item && item.NAMA);
    const bidang = clean_(item && item.BIDANG_TUGAS);
    const status = clean_(item && item.STATUS).toUpperCase() || APP_CONFIG.STATUS.ACTIVE;
    const ijazah = clean_(item && item.IJAZAH);

    if (!id || !nama || !bidang) {
      skipped++;
      errors.push('Baris ' + line + ': ID_KARYAWAN, NAMA, dan BIDANG_TUGAS wajib diisi.');
      return;
    }
    if ([APP_CONFIG.STATUS.ACTIVE, APP_CONFIG.STATUS.INACTIVE].indexOf(status) < 0) {
      skipped++;
      errors.push('Baris ' + line + ': STATUS harus ACTIVE atau INACTIVE.');
      return;
    }
    if (existingIds.has(id.toUpperCase()) || batchIds.has(id.toUpperCase())) {
      skipped++;
      errors.push('Baris ' + line + ': ID_KARYAWAN sudah ada: ' + id);
      return;
    }
    if (nip && (existingNips.has(nip) || batchNips.has(nip))) {
      skipped++;
      errors.push('Baris ' + line + ': NIP sudah ada: ' + nip);
      return;
    }

    gatewayCall_('SPREADSHEET_APPEND', {
      sheet: SCHOOL_KARYAWAN_SHEET,
      row: [id, nip, nama, bidang, status, ijazah]
    });
    batchIds.add(id.toUpperCase());
    if (nip) batchNips.add(nip);
    inserted++;
  });

  const finalData = getAdminSchoolKaryawan();
  return ok_({
    inserted: inserted,
    skipped: skipped,
    errors: errors.slice(0, 100),
    rows: finalData.data && finalData.data.rows ? finalData.data.rows : []
  }, 'Upload template KARYAWAN selesai.');
}

/**
 * Directory umum untuk modul lain.
 * Hanya membaca data KARYAWAN ACTIVE dari spreadsheet sekolah aktif.
 */
function getSchoolKaryawanDirectory() {
  const admin = requireAdminSekolah_();
  ensureAdminSchoolKaryawanSheet_();
  const result = getAdminSchoolKaryawan();
  const rows = result.data && result.data.rows ? result.data.rows : [];
  return ok_(rows.filter(function(row) {
    return clean_(row.STATUS).toUpperCase() !== APP_CONFIG.STATUS.INACTIVE;
  }).map(function(row) {
    return {
      ID_KARYAWAN: row.ID_KARYAWAN,
      NIP: row.NIP,
      NAMA: row.NAMA,
      BIDANG_TUGAS: row.BIDANG_TUGAS,
      STATUS: row.STATUS,
      IJAZAH: row.IJAZAH
    };
  }), 'Directory KARYAWAN berhasil dimuat.');
}

function ensureAdminSchoolKaryawanSheet() {
  const result = ensureAdminSchoolKaryawanSheet_();
  return ok_(result && result.data ? result.data : result, 'Sheet KARYAWAN berhasil diperiksa/dibuat.');
}
