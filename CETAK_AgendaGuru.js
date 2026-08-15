/**
 * SIM SATRIA — CETAK AGENDA GURU
 * Pembentuk PDF Agenda Mengajar berdasarkan format laporan sekolah.
 * Sumber identitas Kepala Sekolah: KEPALA_SEKOLAH.
 * Prioritas tanda tangan: bentuk-1, fallback bentuk-2.
 */
const CETAK_AGENDA_LOGO_URL_ = 'https://drive.google.com/thumbnail?id=1G_kMOxFeLNY6OSgM-DJvRa5ESGZH84U2&sz=w4000';

function cetakAgendaMengajarCETAK(tanggalAwal, tanggalAkhir) {
  requirePermission_(APP_CONFIG.PERMISSION.PDF, 'AGENDA_GURU');
  const start = clean_(tanggalAwal), end = clean_(tanggalAkhir);
  if (!start || !end) throw new Error('Tanggal awal dan tanggal akhir wajib diisi.');
  if (start > end) throw new Error('Tanggal awal tidak boleh lebih besar dari tanggal akhir.');

  const list = getAgendaMengajarList(start, end);
  const rows = list && list.data && Array.isArray(list.data.rows) ? list.data.rows : [];
  if (!rows.length) throw new Error('Tidak ada agenda pada rentang tanggal yang dipilih.');

  const session = getSessionContext();
  const school = session && session.data && session.data.school ? session.data.school : {};
  const user = getAgendaUser_();
  const ks = getKepalaSekolahAktif_() || {};
  const guru = getCetakAgendaGuru_(user);
  const html = buildCETAKAgendaGuruHtml_(school, guru, ks, start, end, rows);
  const fileName = 'CETAK_Agenda_Guru_' + safeFilePart_(guru.nama || user.nama || 'Guru') + '_' + start.replace(/-/g,'') + '_' + end.replace(/-/g,'');
  const result = pdfViaGateway('AGENDA_GURU', {name:fileName, html:html});
  const data = result && result.data ? result.data : result;
  return ok_({
    url: data && (data.url || data.fileUrl) ? (data.url || data.fileUrl) : '',
    fileId: data && (data.id || data.fileId) ? (data.id || data.fileId) : '',
    name: data && (data.name || data.fileName) ? (data.name || data.fileName) : fileName
  }, 'CETAK agenda guru berhasil dibuat.');
}

function getCetakAgendaGuru_(user) {
  const out = {nama: clean_(user && user.nama), nip: '', mapel: ''};
  try {
    const result = readSheetViaGateway('GURU');
    const data = result && result.data ? result.data : result;
    const values = data && Array.isArray(data.values) ? data.values : [];
    if (values.length < 2) return out;
    const h = values[0].map(function(v){ return clean_(v).toLowerCase(); });
    const iNama = h.indexOf('nama'), iNip = h.indexOf('nip'), iMapel = h.indexOf('mapel');
    const namaKey = out.nama.toLowerCase();
    for (let i=1; i<values.length; i++) {
      const nama = iNama >= 0 ? clean_(values[i][iNama]) : '';
      const nip = iNip >= 0 ? clean_(values[i][iNip]) : '';
      if ((nip && clean_(user && (user.nip || user.NIP)) === nip) || (nama && nama.toLowerCase() === namaKey)) {
        out.nama = nama || out.nama;
        out.nip = nip;
        out.mapel = iMapel >= 0 ? clean_(values[i][iMapel]) : '';
        break;
      }
    }
  } catch (e) {}
  return out;
}

function buildCETAKAgendaGuruHtml_(school, guru, ks, start, end, rows) {
  const esc = function(v){return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');};
  const logo = CETAK_AGENDA_LOGO_URL_;
  const sign = clean_(ks['PREVIEW GAMBAR TANDA TANGAN (IMAGE) bentuk-1']) || clean_(ks['PREVIEW GAMBAR TANDA TANGAN (IMAGE) bentuk-2']);
  const namaSekolah = clean_(school.namaSekolah || school.nama_sekolah || 'SMA NEGERI 2 SUKOREJO');
  const provinsi = clean_(school.provinsi || 'PEMERINTAH PROVINSI JAWA TENGAH');
  const dinas = clean_(school.dinas || 'DINAS PENDIDIKAN');
  const alamat = clean_(school.alamat || '');
  const body = rows.map(function(r,i){
    return '<tr>' +
      '<td class="no">'+(i+1)+'</td>' +
      '<td>'+esc(r.tanggal)+'</td>' +
      '<td>'+esc(r.sesi)+'</td>' +
      '<td>'+esc(r.kelas)+'</td>' +
      '<td>'+esc(r.tujuan_pembelajaran)+'</td>' +
      '<td>'+esc(r.dpl)+'</td>' +
      '<td>'+esc(r.pengalaman_belajar)+'</td>' +
      '<td>'+esc(r.prinsip_pembelajaran)+'</td>' +
      '<td>'+esc(r.rekap_siswa_tidak_masuk || '-')+'</td>' +
      '<td>'+esc(r.materi_pembelajaran)+'</td>' +
      '</tr>';
  }).join('');
  const tanggalCetak = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMMM yyyy');
  return '<!doctype html><html><head><meta charset="UTF-8"><style>'+
    '@page{size:A4 landscape;margin:8mm 9mm 10mm 9mm}'+
    'body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:8.5px;margin:0}'+
    '.kop{display:flex;align-items:center;border-bottom:2px solid #111;padding:0 0 5px;margin-bottom:5px}'+
    '.logo{width:70px;height:70px;object-fit:contain;margin-right:10px}'+
    '.koptext{flex:1;text-align:center;line-height:1.18}.koptext .prov{font-size:11px;font-weight:700}.koptext .dinas{font-size:10px;font-weight:700}.koptext .school{font-size:16px;font-weight:800}.koptext .addr{font-size:8px}.title{text-align:center;font-weight:800;font-size:12px;margin:5px 0 2px}.period{text-align:center;font-size:9px;margin-bottom:7px}'+
    '.identitas{width:100%;border-collapse:collapse;margin-bottom:6px}.identitas td{padding:1px 3px;vertical-align:top}.identitas .lbl{width:55px;font-weight:700}.identitas .sep{width:8px}'+
    'table.data{width:100%;border-collapse:collapse;table-layout:fixed}table.data th,table.data td{border:0.6px solid #777;padding:3px 3px;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere;line-height:1.2}table.data th{background:#e8e8e8;text-align:center;font-weight:800;font-size:7.5px}table.data td{font-size:7.5px}table.data .no{text-align:center;width:3%}table.data th:nth-child(2){width:6%}table.data th:nth-child(3){width:8%}table.data th:nth-child(4){width:6%}table.data th:nth-child(5){width:18%}table.data th:nth-child(6){width:12%}table.data th:nth-child(7){width:11%}table.data th:nth-child(8){width:11%}table.data th:nth-child(9){width:11%}table.data th:nth-child(10){width:14%}'+
    '.signature{margin-top:9px;margin-left:auto;width:190px;text-align:center;line-height:1.2;position:relative}.signature .place{margin-bottom:2px}.signimg{height:50px;max-width:150px;object-fit:contain;display:block;margin:0 auto 2px}.signspace{height:50px}.signature .name{font-weight:800;text-decoration:underline}.footer{position:fixed;bottom:-4mm;left:0;right:0;text-align:right;font-size:6.5px;color:#777}'+
    '</style></head><body>'+
    '<div class="kop"><img class="logo" src="'+esc(logo)+'"><div class="koptext"><div class="prov">'+esc(provinsi)+'</div><div class="dinas">'+esc(dinas)+'</div><div class="school">'+esc(namaSekolah)+'</div><div class="addr">'+esc(alamat)+'</div></div></div>'+
    '<div class="title">LAPORAN AGENDA MENGAJAR GURU</div><div class="period">Periode: '+esc(start)+' s.d '+esc(end)+'</div>'+
    '<table class="identitas"><tr><td class="lbl">Nama Guru</td><td class="sep">:</td><td>'+esc(guru.nama)+'</td><td class="lbl">Mapel</td><td class="sep">:</td><td>'+esc(guru.mapel || '-')+'</td></tr><tr><td class="lbl">NIP</td><td class="sep">:</td><td>'+esc(guru.nip || '-')+'</td><td class="lbl">Jumlah Agenda</td><td class="sep">:</td><td>'+rows.length+'</td></tr></table>'+
    '<table class="data"><thead><tr><th>No</th><th>Tanggal</th><th>Jam ke-</th><th>Kelas</th><th>Tujuan Pembelajaran</th><th>DPL</th><th>Pengalaman Belajar</th><th>Prinsip Pembelajaran</th><th>Siswa Tidak Masuk</th><th>Materi & Catatan</th></tr></thead><tbody>'+body+'</tbody></table>'+
    '<div class="signature"><div class="place">Kendal, '+esc(tanggalCetak)+'</div><div>Mengetahui,</div><div>Kepala Sekolah</div>'+(sign?'<img class="signimg" src="'+esc(sign)+'">':'<div class="signspace"></div>')+'<div class="name">'+esc(ks.NAMA || '-')+'</div><div>NIP. '+esc(ks.NIP || '-')+'</div></div>'+
    '<div class="footer">Dicetak secara otomatis melalui SIM SATRIA • '+esc(namaSekolah)+'</div></body></html>';
}

function safeFilePart_(value) {
  return clean_(value || 'Guru').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80) || 'Guru';
}
