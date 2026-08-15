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

/** Runtime authentication untuk deployment USER_ACCESSING. */
function getSessionContext() {
  const email = getCurrentUser_();

  // OWNER aplikasi adalah akun khusus pengelola MASTER.
  // Tidak dipaksa masuk MASTER_USER karena OWNER bukan akun sekolah.
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

  const user = getRuntimeUserByEmail_(email);
  if (!user || clean_(user.status).toUpperCase() !== 'ACTIVE') {
    throw new Error('User belum terdaftar atau status user tidak ACTIVE.');
  }

  const role = clean_(user.role).toUpperCase();
  const school = getRuntimeSchoolById_(user.id_sekolah);
  if (!school) throw new Error('Sekolah user belum terdaftar atau tidak aktif.');

  return ok_({
    user: {
      idUser: clean_(user.id_user),
      nama: clean_(user.nama),
      email: email,
      role: role,
      idSekolah: clean_(user.id_sekolah).toUpperCase()
    },
    school: {
      idSekolah: clean_(school.id_sekolah).toUpperCase(),
      npsn: clean_(school.npsn),
      namaSekolah: clean_(school.nama_sekolah),
      spreadsheetId: clean_(school.spreadsheet_id),
      driveFolderId: clean_(school.drive_folder_id)
    },
    permissions: getRuntimePermissions_(role, ''),
    menus: getRuntimeMenusForRole_(role)
  }, 'Sesi aktif.');
}
