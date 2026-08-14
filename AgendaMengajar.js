/**
 * MENU FUNGSIONAL: AGENDA MENGAJAR GURU
 * Versi sederhana: tampilkan form dan simpan melalui Write Gateway.
 */
const AGENDA_MENGAJAR_MENU = 'AGENDA_GURU';
const AGENDA_MENGAJAR_SHEET = 'TRX_AGENDA_GURU';

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
    rekapTidakMasuk
  ];

  const result = saveDataViaGateway(
    AGENDA_MENGAJAR_MENU,
    AGENDA_MENGAJAR_SHEET,
    row
  );

  return ok_({
    idUser: clean_(user.idUser || user.id_user),
    nama: clean_(user.nama),
    tanggal: tanggal,
    sesi: sesi,
    kelas: kelas,
    sheet: AGENDA_MENGAJAR_SHEET,
    gateway: result
  }, 'Agenda mengajar berhasil disimpan.');
}

function getAgendaMengajarFormOptions() {
  requirePermission_(APP_CONFIG.PERMISSION.READ, AGENDA_MENGAJAR_MENU);
  return ok_({
    sesi: ['Sesi-1','Sesi-2','Sesi-3','Sesi-4','Sesi-5','Sesi-6','Sesi-7','Sesi-8','Sesi-9','Sesi-10']
  });
}
