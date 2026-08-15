/**
 * MENU FUNGSIONAL: AGENDA MENGAJAR GURU
 * Input, daftar, CRUD dan PDF melalui Write Gateway.
 */
const AGENDA_MENGAJAR_MENU = 'AGENDA_GURU';
const AGENDA_MENGAJAR_SHEET = 'TRX_AGENDA_GURU';
const AGENDA_MENGAJAR_COLUMNS = [
  'timestamp','id_user','nama','tanggal','sesi','kelas',
  'tujuan_pembelajaran','materi_pembelajaran','dpl','pengalaman_belajar',
  'prinsip_pembelajaran','rekap_siswa_tidak_masuk','bukti_fisik'
];

const AGENDA_MENGAJAR_OPTIONS = Object.freeze({
  sesi: ['Jam ke-1','Jam ke-2','Jam ke-3','Jam ke-4','Jam ke-5','Jam ke-6','Jam ke-7','Jam ke-8','Jam ke-9','Jam ke-10'],
  dpl: ['Keimanan dan Ketakwaan','Kewargaan','Penalaran Kritis','Kreativitas','Kolaborasi','Kemandirian','Kesehatan','Komunikasi'],
  prinsip: ['Berkesadaran','Bermakna','Menggembirakan'],
  pengalaman: ['Memahami','Menerapkan','Merefleksi'],
  kelasMock: ['X','XI','XII']
});

function getAgendaUser_() {
  const session = getSessionContext();
  if (!session || session.ok !== true || !session.data || !session.data.user) {
    throw new Error('Sesi pengguna tidak tersedia.');
  }
  return session.data.user;
}

function simpanAgendaMengajar(data) {
  requirePermission_(APP_CONFIG.PERMISSION.INPUT, AGENDA_MENGAJAR_MENU);
  data = data || {};
  const tanggal = clean_(data.tanggal);
  const sesi = clean_(data.sesi);
  const kelas = clean_(data.kelas);
  const tujuan = clean_(data.tujuan);
  const materi = clean_(data.materi);
  const dpl = clean_(data.dpl);
  const pengalaman = clean_(data.pengalaman);
  const prinsip = clean_(data.prinsip);
  const rekapTidakMasuk = clean_(data.rekapTidakMasuk);
  const buktiFisik = clean_(data.buktiFisik);

  if (!tanggal) throw new Error('Tanggal wajib diisi.');
  if (!sesi) throw new Error('Jam ke- wajib dipilih.');
  if (!kelas) throw new Error('Kelas wajib dipilih.');
  if (!tujuan) throw new Error('Tujuan pembelajaran wajib diisi.');
  if (!materi) throw new Error('Materi pembelajaran wajib diisi.');

  const user = getAgendaUser_();
  const row = [
    new Date(), clean_(user.idUser || user.id_user), clean_(user.nama), tanggal,
    sesi, kelas, tujuan, materi, dpl, pengalaman, prinsip, rekapTidakMasuk, buktiFisik
  ];
  const result = saveDataViaGateway(AGENDA_MENGAJAR_MENU, AGENDA_MENGAJAR_SHEET, row);
  return ok_({ idUser: clean_(user.idUser || user.id_user), nama: clean_(user.nama), tanggal, sesi, kelas, buktiFisik, columns: AGENDA_MENGAJAR_COLUMNS, sheet: AGENDA_MENGAJAR_SHEET, gateway: result }, 'Agenda mengajar berhasil disimpan.');
}

function simpanBuktiFisikAgendaMengajar(file) {
  requirePermission_(APP_CONFIG.PERMISSION.UPLOAD, AGENDA_MENGAJAR_MENU);
  if (!file || !file.base64 || !file.name) throw new Error('File bukti fisik belum dipilih.');
  const mimeType = clean_(file.mimeType).toLowerCase();
  const allowedMime = ['image/jpeg','image/png','image/webp','image/gif'];
  if (allowedMime.indexOf(mimeType) < 0) throw new Error('Bukti fisik hanya boleh berupa gambar JPG, PNG, WEBP, atau GIF.');
  if (Number(file.sizeBytes || 0) > 2 * 1024 * 1024) throw new Error('Ukuran bukti fisik maksimal 2 MB.');
  if (Math.floor(String(file.base64).length * 3 / 4) > 2 * 1024 * 1024) throw new Error('Ukuran bukti fisik maksimal 2 MB.');
  const result = uploadViaGateway(AGENDA_MENGAJAR_MENU, { base64: file.base64, mimeType, name: file.name });
  return ok_({
    fileId: result.data && (result.data.id || result.data.fileId) || result.id || '',
    fileName: result.data && (result.data.name || result.data.fileName) || result.name || file.name,
    url: result.data && (result.data.url || result.data.fileUrl) || result.url || ''
  }, 'Bukti fisik berhasil diunggah.');
}

function getAgendaMengajarFormOptions() {
  requirePermission_(APP_CONFIG.PERMISSION.READ, AGENDA_MENGAJAR_MENU);
  const user = getAgendaUser_();
  let kelas = AGENDA_MENGAJAR_OPTIONS.kelasMock.slice();
  let sumberKelas = 'MOCK';
  try {
    const result = readSheetViaGateway('KELAS');
    const data = result && result.data ? result.data : result;
    if (data && data.exists === true) {
      const values = Array.isArray(data.values) ? data.values : [];
      const fromSheet = extractKelasFromSheet_(values);
      if (fromSheet.length) { kelas = fromSheet; sumberKelas = 'KELAS'; }
    }
  } catch (e) {}
  return ok_({ nama: clean_(user.nama), idUser: clean_(user.idUser || user.id_user), sesi: AGENDA_MENGAJAR_OPTIONS.sesi.slice(), dpl: AGENDA_MENGAJAR_OPTIONS.dpl.slice(), prinsip: AGENDA_MENGAJAR_OPTIONS.prinsip.slice(), pengalaman: AGENDA_MENGAJAR_OPTIONS.pengalaman.slice(), kelas, sumberKelas });
}

function extractKelasFromSheet_(values) {
  if (!values || !values.length) return [];
  const header = values[0].map(function(v){ return clean_(v).toLowerCase(); });
  let idx = header.findIndex(function(h){ return /^(kelas|nama_kelas|nama kelas|kode_kelas|kode kelas|tingkat)$/.test(h); });
  let start = 1;
  if (idx < 0) { idx = 0; start = 0; }
  const seen = {}, result = [];
  for (let i=start; i<values.length; i++) {
    const value = clean_(values[i][idx]);
    if (!value) continue;
    const key = value.toUpperCase();
    if (seen[key]) continue;
    seen[key] = true;
    result.push(value);
  }
  return result;
}

/** Membaca TRX_AGENDA_GURU melalui Gateway dan hanya mengembalikan agenda user aktif. */
function getAgendaMengajarList(tanggalAwal, tanggalAkhir) {
  requirePermission_(APP_CONFIG.PERMISSION.READ, AGENDA_MENGAJAR_MENU);
  const user = getAgendaUser_();
  const userId = clean_(user.idUser || user.id_user);
  const start = clean_(tanggalAwal);
  const end = clean_(tanggalAkhir);
  if (!start || !end) throw new Error('Tanggal awal dan tanggal akhir wajib diisi.');
  if (start > end) throw new Error('Tanggal awal tidak boleh lebih besar dari tanggal akhir.');

  const result = readSheetViaGateway(AGENDA_MENGAJAR_SHEET);
  const data = result && result.data ? result.data : result;
  if (!data || data.exists !== true || !Array.isArray(data.values) || data.values.length < 2) return ok_({ rows: [], total: 0 });

  const values = data.values;
  const header = values[0].map(function(v){ return clean_(v).toLowerCase(); });
  const idx = {};
  AGENDA_MENGAJAR_COLUMNS.forEach(function(col){ idx[col] = header.indexOf(col); });
  if (idx.id_user < 0 || idx.tanggal < 0) throw new Error('Struktur TRX_AGENDA_GURU belum sesuai header.');

  const rows = [];
  for (let i=1; i<values.length; i++) {
    const r = values[i];
    if (clean_(r[idx.id_user]) !== userId) continue;
    const tgl = clean_(r[idx.tanggal]);
    if (tgl < start || tgl > end) continue;
    rows.push({
      rowNumber: i + 1,
      timestamp: cell_(r, idx.timestamp), id_user: cell_(r, idx.id_user), nama: cell_(r, idx.nama),
      tanggal: tgl, sesi: cell_(r, idx.sesi), kelas: cell_(r, idx.kelas),
      tujuan_pembelajaran: cell_(r, idx.tujuan_pembelajaran), materi_pembelajaran: cell_(r, idx.materi_pembelajaran),
      dpl: cell_(r, idx.dpl), pengalaman_belajar: cell_(r, idx.pengalaman_belajar),
      prinsip_pembelajaran: cell_(r, idx.prinsip_pembelajaran), rekap_siswa_tidak_masuk: cell_(r, idx.rekap_siswa_tidak_masuk),
      bukti_fisik: cell_(r, idx.bukti_fisik)
    });
  }
  rows.sort(function(a,b){ return a.tanggal.localeCompare(b.tanggal) || a.rowNumber - b.rowNumber; });
  return ok_({ rows, total: rows.length, nama: clean_(user.nama) });
}

function cell_(row, idx) { return idx >= 0 ? clean_(row[idx]) : ''; }

function getAgendaRowOwned_(rowNumber) {
  const user = getAgendaUser_();
  const result = readSheetViaGateway(AGENDA_MENGAJAR_SHEET);
  const data = result && result.data ? result.data : result;
  if (!data || data.exists !== true || !Array.isArray(data.values)) throw new Error('Data agenda tidak tersedia.');
  const values = data.values;
  const n = Number(rowNumber);
  if (!(n >= 2) || n > values.length) throw new Error('Baris agenda tidak ditemukan.');
  const header = values[0].map(function(v){ return clean_(v).toLowerCase(); });
  const idIdx = header.indexOf('id_user');
  if (idIdx < 0) throw new Error('Kolom id_user tidak ditemukan.');
  const row = values[n - 1];
  const userId = clean_(user.idUser || user.id_user);
  if (clean_(row[idIdx]) !== userId) throw new Error('Agenda bukan milik user aktif.');
  return { user: user, values: values, row: row, rowNumber: n, header: header };
}

function updateAgendaMengajar(data) {
  requirePermission_(APP_CONFIG.PERMISSION.INPUT, AGENDA_MENGAJAR_MENU);
  data = data || {};
  const owned = getAgendaRowOwned_(data.rowNumber);
  const user = owned.user;
  const row = owned.row.slice();
  const header = owned.header;
  const put = function(name, value){ const i = header.indexOf(name); if(i >= 0) row[i] = clean_(value); };
  put('nama', user.nama); put('tanggal', data.tanggal); put('sesi', data.sesi); put('kelas', data.kelas);
  put('tujuan_pembelajaran', data.tujuan); put('materi_pembelajaran', data.materi); put('dpl', data.dpl);
  put('pengalaman_belajar', data.pengalaman); put('prinsip_pembelajaran', data.prinsip);
  put('rekap_siswa_tidak_masuk', data.rekapTidakMasuk);
  if (data.buktiFisik !== undefined) put('bukti_fisik', data.buktiFisik);
  if (!clean_(data.tanggal) || !clean_(data.sesi) || !clean_(data.kelas) || !clean_(data.tujuan) || !clean_(data.materi)) throw new Error('Tanggal, Jam ke-, Kelas, Tujuan dan Materi wajib diisi.');
  const result = gatewayCall_('SPREADSHEET_UPDATE_ROW', { sheet: AGENDA_MENGAJAR_SHEET, rowNumber: owned.rowNumber, row });
  return ok_({ rowNumber: owned.rowNumber, gateway: result }, 'Agenda berhasil diperbarui.');
}

function hapusAgendaMengajar(rowNumber) {
  requirePermission_(APP_CONFIG.PERMISSION.INPUT, AGENDA_MENGAJAR_MENU);
  const owned = getAgendaRowOwned_(rowNumber);
  const result = gatewayCall_('SPREADSHEET_DELETE_ROW', { sheet: AGENDA_MENGAJAR_SHEET, rowNumber: owned.rowNumber });
  return ok_({ rowNumber: owned.rowNumber, gateway: result }, 'Agenda berhasil dihapus.');
}

/**
 * Membuat PDF independen di folder sekolah melalui PDF Gateway.
 * Frontend menerima URL file dan membukanya pada tab baru.
 */
function cetakAgendaMengajarPdf(tanggalAwal, tanggalAkhir) {
  requirePermission_(APP_CONFIG.PERMISSION.PDF, AGENDA_MENGAJAR_MENU);
  const list = getAgendaMengajarList(tanggalAwal, tanggalAkhir);
  if (!list || list.ok !== true || !list.data || !list.data.rows.length) throw new Error('Tidak ada agenda pada rentang tanggal yang dipilih.');
  const user = getAgendaUser_();
  const school = getSessionContext().data.school || {};
  const namaSekolah = clean_(school.namaSekolah || school.nama_sekolah || 'SIM SATRIA');
  const html = buildAgendaPdfHtml_(namaSekolah, user.nama, tanggalAwal, tanggalAkhir, list.data.rows);
  const name = 'Agenda_Mengajar_' + String(tanggalAwal).replace(/-/g,'') + '_' + String(tanggalAkhir).replace(/-/g,'');
  const result = pdfViaGateway(AGENDA_MENGAJAR_MENU, { name: name, html: html });
  return ok_({ url: result.data && result.data.url ? result.data.url : result.url, fileId: result.data && result.data.id ? result.data.id : result.id, name: result.data && result.data.name ? result.data.name : result.name }, 'PDF agenda berhasil dibuat.');
}

function buildAgendaPdfHtml_(namaSekolah, namaGuru, start, end, rows) {
  const esc = function(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); };
  const body = rows.map(function(r, i){
    return '<tr><td>'+(i+1)+'</td><td>'+esc(r.tanggal)+'</td><td>'+esc(r.sesi)+'</td><td>'+esc(r.kelas)+'</td><td>'+esc(r.tujuan_pembelajaran)+'</td><td>'+esc(r.materi_pembelajaran)+'</td><td>'+esc(r.dpl)+'</td><td>'+esc(r.pengalaman_belajar)+'</td><td>'+esc(r.prinsip_pembelajaran)+'</td><td>'+esc(r.rekap_siswa_tidak_masuk)+'</td></tr>';
  }).join('');
  return '<!doctype html><html><head><meta charset="UTF-8"><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#183b30;font-size:9px}h1{font-size:18px;margin:0 0 3px}h2{font-size:12px;margin:0 0 8px;font-weight:400}p{margin:3px 0 8px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #b8c9c0;padding:4px;vertical-align:top;word-wrap:break-word}th{background:#e8f2ed;font-weight:700}th:nth-child(1){width:3%}th:nth-child(2){width:6%}th:nth-child(3){width:8%}th:nth-child(4){width:6%}th:nth-child(5){width:16%}th:nth-child(6){width:14%}th:nth-child(7){width:12%}th:nth-child(8){width:10%}th:nth-child(9){width:10%}th:nth-child(10){width:10%}.footer{margin-top:8px;font-size:8px}</style></head><body><h1>'+esc(namaSekolah)+'</h1><h2>AGENDA MENGAJAR GURU</h2><p><b>Guru:</b> '+esc(namaGuru)+' &nbsp; | &nbsp; <b>Periode:</b> '+esc(start)+' s.d. '+esc(end)+' &nbsp; | &nbsp; <b>Total:</b> '+rows.length+'</p><table><thead><tr><th>No</th><th>Tanggal</th><th>Jam ke-</th><th>Kelas</th><th>Tujuan Pembelajaran</th><th>Materi Pembelajaran</th><th>DPL</th><th>Pengalaman</th><th>Prinsip</th><th>Siswa Tidak Masuk</th></tr></thead><tbody>'+body+'</tbody></table><div class="footer">Dicetak melalui SIM SATRIA.</div></body></html>';
}
