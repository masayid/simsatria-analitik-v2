/**
 * SIM SATRIA — MASTER KEPALA SEKOLAH
 * Khusus ADMIN_SEKOLAH. Data bersumber dari spreadsheet sekolah aktif.
 */
const KS_SHEET_ = 'KEPALA_SEKOLAH';
const KS_HEADERS_ = Object.freeze([
  'ID_KS','NAMA','NIP','NUPTK','PANGKAT','GOLONGAN',
  'PREVIEW GAMBAR TANDA TANGAN (IMAGE) bentuk-1',
  'PREVIEW GAMBAR TANDA TANGAN (IMAGE) bentuk-2'
]);
const KS_MAX_IMAGE_BYTES_ = 1024 * 1024;

function ensureKepalaSekolahSheet_() {
  requireAdminSekolah_();
  const result = gatewayCall_('SPREADSHEET_ENSURE_SHEET', { sheet: KS_SHEET_, headers: KS_HEADERS_.slice() });
  return result && result.data ? result.data : result;
}

function getKepalaSekolahData() {
  const context = getSessionContext();
  if (!context || context.ok !== true || !context.data || !context.data.school) throw new Error('School scope belum tersedia.');
  const result = readSheetViaGateway(KS_SHEET_);
  const data = result && result.data ? result.data : result;
  const values = data && Array.isArray(data.values) ? data.values : [];
  if (values.length < 2) return ok_({ exists: !!(data && data.exists), headers: KS_HEADERS_.slice(), rows: [] }, 'Data Kepala Sekolah belum tersedia.');
  const headers = values[0].map(function(v){ return String(v || '').trim().toUpperCase(); });
  const index = {};
  KS_HEADERS_.forEach(function(h){ index[h] = headers.indexOf(h.toUpperCase()); });
  const missing = KS_HEADERS_.filter(function(h){ return index[h] < 0; });
  if (missing.length) throw new Error('Header KEPALA_SEKOLAH tidak lengkap: ' + missing.join(', '));
  const rows = values.slice(1).map(function(row, i){
    if (!row.some(function(v){ return String(v || '').trim() !== ''; })) return null;
    const out = { _row: i + 2 };
    KS_HEADERS_.forEach(function(h){ out[h] = String(row[index[h]] || '').trim(); });
    return out;
  }).filter(Boolean);
  return ok_({ exists: true, headers: KS_HEADERS_.slice(), rows: rows, active: rows[0] || null }, 'Data Kepala Sekolah berhasil dimuat.');
}

function saveKepalaSekolah(data) {
  const admin = requireAdminSekolah_();
  ensureKepalaSekolahSheet_();
  const p = data || {};
  const id = clean_(p.ID_KS);
  const nama = clean_(p.NAMA);
  const nip = clean_(p.NIP);
  const nuptk = clean_(p.NUPTK);
  const pangkat = clean_(p.PANGKAT);
  const golongan = clean_(p.GOLONGAN);
  const sign1 = clean_(p['PREVIEW GAMBAR TANDA TANGAN (IMAGE) bentuk-1']);
  const sign2 = clean_(p['PREVIEW GAMBAR TANDA TANGAN (IMAGE) bentuk-2']);
  const rowNumber = Number(p._row || 0);
  if (!id || !nama) throw new Error('ID_KS dan NAMA wajib diisi.');
  const current = getKepalaSekolahData();
  const rows = current.data && current.data.rows ? current.data.rows : [];
  rows.forEach(function(r){ if (Number(r._row) !== rowNumber && String(r.ID_KS).toUpperCase() === id.toUpperCase()) throw new Error('ID_KS sudah terdaftar.'); });
  const row = [id,nama,nip,nuptk,pangkat,golongan,sign1,sign2];
  if (rowNumber >= 2) gatewayCall_('SPREADSHEET_UPDATE_ROW', { sheet: KS_SHEET_, rowNumber: rowNumber, row: row });
  else {
    if (rows.length > 0) {
      if (!confirmKepalaSekolahReplace_(rows[0])) throw new Error('Data Kepala Sekolah sudah ada. Gunakan Edit untuk memperbarui data.');
    }
    gatewayCall_('SPREADSHEET_APPEND', { sheet: KS_SHEET_, row: row });
  }
  return getKepalaSekolahData();
}

function confirmKepalaSekolahReplace_(row) { return false; }

function deleteKepalaSekolah(rowNumber) {
  requireAdminSekolah_();
  ensureKepalaSekolahSheet_();
  const row = Number(rowNumber);
  if (row < 2) throw new Error('Baris Kepala Sekolah tidak valid.');
  gatewayCall_('SPREADSHEET_DELETE_ROW', { sheet: KS_SHEET_, rowNumber: row });
  return getKepalaSekolahData();
}

function uploadKepalaSekolahSignature(dataUrl, fileName, bentuk) {
  requireAdminSekolah_();
  if (!dataUrl || !fileName) throw new Error('File tanda tangan wajib dipilih.');
  const match = String(dataUrl).match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) throw new Error('Tanda tangan harus berupa PNG, JPG/JPEG, atau WEBP.');
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > KS_MAX_IMAGE_BYTES_) throw new Error('Ukuran tanda tangan maksimal 1 MB.');
  if (bytes.length < 1024) throw new Error('File gambar tanda tangan terlalu kecil atau tidak valid.');
  const suffix = String(bentuk || '1') === '2' ? 'BENTUK_2' : 'BENTUK_1';
  const safe = String(fileName).replace(/[^A-Za-z0-9._-]/g, '_');
  const upload = gatewayCall_('DRIVE_UPLOAD', {
    base64: match[2],
    mimeType: match[1],
    fileName: 'KEPALA_SEKOLAH_' + suffix + '_' + safe,
    module: 'KEPALA_SEKOLAH'
  });
  const data = upload && upload.data ? upload.data : upload;
  return ok_(data, 'Tanda tangan berhasil diunggah.');
}

function getKepalaSekolahAktif_() {
  const result = getKepalaSekolahData();
  return result.data && result.data.active ? result.data.active : null;
}
