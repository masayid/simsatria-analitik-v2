/** Identifikasi user dari akun Google yang sedang mengakses web app. */
function getCurrentUser_() {
  const email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Akun Google tidak teridentifikasi. Pastikan deployment web app menggunakan akun/domain yang benar.');
  return email.toLowerCase();
}

/**
 * OWNER aplikasi ditentukan oleh Script Property SETUP_OWNER_EMAIL.
 * OWNER tidak wajib menjadi baris pada MASTER_USER.
 */
function isAppOwner_(email) {
  const target = clean_(email).toLowerCase();
  const owner = clean_(PropertiesService.getScriptProperties()
    .getProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL)).toLowerCase();
  return !!target && !!owner && target === owner;
}

/**
 * Runtime authentication untuk deployment USER_ACCESSING.
 *
 * SUMBER IDENTITAS USER SEKOLAH:
 * - ADMIN_SEKOLAH : MASTER_USER
 * - GURU/WALI_KELAS/KARYAWAN/SISWA/dll : USERS pada Spreadsheet sekolah
 *
 * Sengaja tidak memakai getRuntimeUserByEmail_() untuk user sekolah,
 * karena Runtime Auth Directory adalah cache dan dapat tertinggal setelah
 * Admin Sekolah menambah/mengubah user pada sheet USERS.
 */
function getSessionContext() {
  const email = getCurrentUser_();

  // OWNER aplikasi adalah akun khusus pengelola MASTER.
  if (isAppOwner_(email)) {
    return ok_({
      user: {
        idUser: 'OWNER',
        nama: 'Owner SIM SATRIA',
        email: email,
        role: 'OWNER',
        idSekolah: ''
      },
      school: {
        idSekolah: '',
        npsn: '',
        namaSekolah: 'MASTER / Semua Sekolah',
        spreadsheetId: '',
        driveFolderId: ''
      },
      permissions: [APP_CONFIG.PERMISSION.ADMIN],
      menus: [{
        kode_menu: 'MASTER_ADMIN',
        nama_menu: 'Pengaturan MASTER',
        parent_id: '',
        urutan: 0,
        icon: '⚙',
        aktif: 'TRUE'
      }]
    }, 'Sesi OWNER aktif.');
  }

  // PENTING:
  // Untuk user sekolah, baca langsung USERS sekolah masing-masing.
  // Fungsi ini sudah memiliki aturan:
  //   1. ADMIN_SEKOLAH hanya dari MASTER_USER.
  //   2. User selain ADMIN_SEKOLAH dicari pada USERS sekolah.
  // Dengan demikian MASTER_USER tidak dapat membuat akun GURU runtime.
  const user = findUserByEmailFromSchoolUsers_(email);
  if (!user || clean_(user.status).toUpperCase() !== 'ACTIVE') {
    throw new Error('User belum terdaftar pada sheet USERS sekolah atau status user tidak ACTIVE.');
  }

  const role = clean_(user.role).toUpperCase();
  const school = {
    id_sekolah: clean_(user.id_sekolah).toUpperCase(),
    npsn: clean_(user.npsn),
    nama_sekolah: clean_(user.nama_sekolah),
    spreadsheet_id: clean_(user.spreadsheet_id),
    drive_folder_id: ''
  };

  // Drive folder tetap diambil dari konfigurasi sekolah runtime/MASTER.
  // Identitas user tetap berasal dari USERS sekolah.
  try {
    const runtimeSchool = getRuntimeSchoolById_(school.id_sekolah);
    if (runtimeSchool) school.drive_folder_id = clean_(runtimeSchool.drive_folder_id);
  } catch (e) {
    // Tidak menggagalkan login hanya karena cache runtime belum tersedia.
  }

  if (!school.spreadsheet_id) {
    throw new Error('Spreadsheet sekolah user belum dikonfigurasi.');
  }

  return ok_({
    user: {
      idUser: clean_(user.id_user),
      nama: clean_(user.nama),
      email: email,
      role: role,
      idSekolah: school.id_sekolah
    },
    school: {
      idSekolah: school.id_sekolah,
      npsn: school.npsn,
      namaSekolah: school.nama_sekolah,
      spreadsheetId: school.spreadsheet_id,
      driveFolderId: school.drive_folder_id
    },
    permissions: getRuntimePermissions_(role, ''),
    menus: getRuntimeMenusForRole_(role)
  }, 'Sesi aktif.');
}
