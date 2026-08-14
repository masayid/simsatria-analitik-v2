/**
 * MENU FUNGSIONAL: AGENDA MENGAJAR GURU
 * Versi sederhana: simpan agenda dan bukti fisik melalui Write Gateway.
 */
const AGENDA_MENGAJAR_MENU = 'AGENDA_GURU';
const AGENDA_MENGAJAR_SHEET = 'TRX_AGENDA_GURU';
const AGENDA_MENGAJAR_COLUMNS = [
  'timestamp','id_user','nama','tanggal','sesi','kelas',
  'tujuan_pembelajaran','materi_pembelajaran','dpl','pengalaman_belajar',
  'prinsip_pembelajaran','rekap_siswa_tidak_masuk','bukti_fisik'
];

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
  if (!sesi) throw new Error('Sesi wajib dipilih.');
  if (!kelas) throw new Error('Kelas wajib diisi.');
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
  const result = uploadViaGateway(AGENDA_MENGAJAR_MENU, {
    base64: file.base64,
    mimeType: file.mimeType || 'application/octet-stream',
    name: file.name
  });
  return ok_({
    fileId: result.data && (result.data.id || result.data.fileId) || result.id || '',
    fileName: result.data && (result.data.name || result.data.fileName) || result.name || file.name,
    url: result.data && (result.data.url || result.data.fileUrl) || result.url || ''
  }, 'Bukti fisik berhasil diunggah.');
}

function getAgendaMengajarFormOptions() {
  requirePermission_(APP_CONFIG.PERMISSION.READ, AGENDA_MENGAJAR_MENU);
  return ok_({
    sesi: ['Sesi-1','Sesi-2','Sesi-3','Sesi-4','Sesi-5','Sesi-6','Sesi-7','Sesi-8','Sesi-9','Sesi-10']
  });
}
