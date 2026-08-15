/**
 * MENU FUNGSIONAL: AGENDA MENGAJAR GURU
 * Sederhana: input agenda + bukti fisik melalui Write Gateway.
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
  dpl: [
    'Keimanan dan Ketakwaan','Kewargaan','Penalaran Kritis','Kreativitas',
    'Kolaborasi','Kemandirian','Kesehatan','Komunikasi'
  ],
  prinsip: ['Berkesadaran','Bermakna','Menggembirakan'],
  pengalaman: ['Memahami','Menerapkan','Merefleksi'],
  kelasMock: ['X','XI','XII']
});

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

  const session = getSessionContext();
  if (!session || session.ok !== true || !session.data || !session.data.user) {
    throw new Error('Sesi pengguna tidak tersedia.');
  }

  const user = session.data.user;
  const row = [
    new Date(),
    clean_(user.idUser || user.id_user),
    clean_(user.nama),
    tanggal,
    sesi,
    kelas,
    tujuan,
    materi,
    dpl,
    pengalaman,
    prinsip,
    rekapTidakMasuk,
    buktiFisik
  ];

  const result = saveDataViaGateway(AGENDA_MENGAJAR_MENU, AGENDA_MENGAJAR_SHEET, row);

  return ok_({
    idUser: clean_(user.idUser || user.id_user),
    nama: clean_(user.nama),
    tanggal: tanggal,
    sesi: sesi,
    kelas: kelas,
    buktiFisik: buktiFisik,
    columns: AGENDA_MENGAJAR_COLUMNS,
    sheet: AGENDA_MENGAJAR_SHEET,
    gateway: result
  }, 'Agenda mengajar berhasil disimpan.');
}

function simpanBuktiFisikAgendaMengajar(file) {
  requirePermission_(APP_CONFIG.PERMISSION.UPLOAD, AGENDA_MENGAJAR_MENU);
  if (!file || !file.base64 || !file.name) throw new Error('File bukti fisik belum dipilih.');

  const mimeType = clean_(file.mimeType).toLowerCase();
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMime.indexOf(mimeType) < 0) {
    throw new Error('Bukti fisik hanya boleh berupa gambar JPG, PNG, WEBP, atau GIF.');
  }

  // Ukuran dikirim dari frontend untuk validasi cepat; batas final juga dicek
  // berdasarkan panjang base64 agar aturan 2 MB tidak hanya bergantung pada UI.
  const sizeBytes = Number(file.sizeBytes || 0);
  if (sizeBytes > 2 * 1024 * 1024) {
    throw new Error('Ukuran bukti fisik maksimal 2 MB.');
  }
  const estimatedBytes = Math.floor(String(file.base64).length * 3 / 4);
  if (estimatedBytes > 2 * 1024 * 1024) {
    throw new Error('Ukuran bukti fisik maksimal 2 MB.');
  }

  const result = uploadViaGateway(AGENDA_MENGAJAR_MENU, {
    base64: file.base64,
    mimeType: mimeType,
    name: file.name
  });

  return ok_({
    fileId: result.data && (result.data.id || result.data.fileId) || result.id || '',
    fileName: result.data && (result.data.name || result.data.fileName) || result.name || file.name,
    url: result.data && (result.data.url || result.data.fileUrl) || result.url || ''
  }, 'Bukti fisik berhasil diunggah.');
}

/**
 * Menyediakan seluruh pilihan form dari satu fungsi agar frontend sederhana.
 * Nama user diambil dari session (Gateway -> USERS sekolah), bukan dari input.
 * Kelas membaca sheet KELAS melalui Gateway jika tersedia; jika tidak ada,
 * gunakan mock X, XI, XII.
 */
function getAgendaMengajarFormOptions() {
  requirePermission_(APP_CONFIG.PERMISSION.READ, AGENDA_MENGAJAR_MENU);

  const session = getSessionContext();
  if (!session || session.ok !== true || !session.data || !session.data.user) {
    throw new Error('Sesi pengguna tidak tersedia.');
  }

  const user = session.data.user;
  let kelas = AGENDA_MENGAJAR_OPTIONS.kelasMock.slice();
  let sumberKelas = 'MOCK';

  try {
    const result = readSheetViaGateway('KELAS');
    const data = result && result.data ? result.data : result;
    if (data && data.exists === true) {
      const values = Array.isArray(data.values) ? data.values : [];
      kelas = extractKelasFromSheet_(values);
      sumberKelas = 'KELAS';
    }
  } catch (e) {
    // Jika sheet KELAS belum ada, tetap gunakan mock agar form tetap berfungsi.
    kelas = AGENDA_MENGAJAR_OPTIONS.kelasMock.slice();
    sumberKelas = 'MOCK';
  }

  return ok_({
    nama: clean_(user.nama),
    idUser: clean_(user.idUser || user.id_user),
    sesi: AGENDA_MENGAJAR_OPTIONS.sesi.slice(),
    dpl: AGENDA_MENGAJAR_OPTIONS.dpl.slice(),
    prinsip: AGENDA_MENGAJAR_OPTIONS.prinsip.slice(),
    pengalaman: AGENDA_MENGAJAR_OPTIONS.pengalaman.slice(),
    kelas: kelas,
    sumberKelas: sumberKelas
  });
}

function extractKelasFromSheet_(values) {
  if (!values || !values.length) return [];

  let headerRow = values[0].map(function (v) { return clean_(v).toLowerCase(); });
  let idx = headerRow.findIndex(function (h) {
    return /^(kelas|nama_kelas|nama kelas|kode_kelas|kode kelas|tingkat)$/.test(h);
  });

  let start = 1;
  if (idx < 0) {
    idx = 0;
    start = 0;
  }

  const seen = {};
  const result = [];
  for (let i = start; i < values.length; i++) {
    const value = clean_(values[i][idx]);
    if (!value) continue;
    const key = value.toUpperCase();
    if (seen[key]) continue;
    seen[key] = true;
    result.push(value);
  }
  return result;
}
