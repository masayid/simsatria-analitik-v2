/** Identifikasi user dari akun Google yang sedang mengakses web app. */
function getCurrentUser_() {
  const email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Akun Google tidak teridentifikasi. Pastikan deployment web app menggunakan akun/domain yang benar.');
  return email.toLowerCase();
}

/** OWNER aplikasi ditentukan oleh Script Property SETUP_OWNER_EMAIL. */
function isAppOwner_(email) {
  const target = clean_(email).toLowerCase();
  const owner = clean_(PropertiesService.getScriptProperties()
    .getProperty(APP_CONFIG.PROP.SETUP_OWNER_EMAIL)).toLowerCase();
  return !!target && !!owner && target === owner;
}

/**
 * Runtime authentication untuk deployment USER_ACCESSING.
 *
 * Jalur identitas:
 * - OWNER         : Script Property SETUP_OWNER_EMAIL.
 * - ADMIN_SEKOLAH : Gateway -> MASTER_USER.
 * - user sekolah : Gateway -> USERS sekolah masing-masing.
 *
 * Web App TIDAK membuka Spreadsheet sekolah secara langsung saat login.
 * Gateway yang berjalan sebagai owner membaca Spreadsheet sekolah, sehingga
 * Admin/Guru/Karyawan/Siswa tidak perlu diberi akses langsung ke Spreadsheet.
 */
function getSessionContext() {
  const email = getCurrentUser_();

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

  // PENTING: lookup user dilakukan melalui Gateway.
  // Jangan panggil findUserByEmailFromSchoolUsers_() di USER_ACCESSING karena
  // fungsi tersebut membuka Spreadsheet sekolah dengan akun user.
  let lookup;
  try {
    lookup = gatewayLookupCurrentUser_();
  } catch (e) {
    throw new Error(
      'Autentikasi sekolah gagal melalui Gateway. ' +
      (e && e.message ? e.message : String(e))
    );
  }

  if (!lookup || !lookup.user || !lookup.school) {
    throw new Error(
      'Akun ' + email +
      ' belum terdaftar pada sheet USERS sekolah atau status user tidak ACTIVE.'
    );
  }

  const user = lookup.user;
  const school = lookup.school;
  const role = clean_(user.role).toUpperCase();

  if (clean_(user.status).toUpperCase() !== 'ACTIVE') {
    throw new Error('Akun ' + email + ' terdaftar tetapi status user tidak ACTIVE.');
  }

  if (!school.id_sekolah || !school.spreadsheet_id) {
    throw new Error('Konfigurasi sekolah user belum lengkap.');
  }

  // Permission/menu tetap memakai Runtime Auth Directory sebagai cache
  // konfigurasi MASTER. Yang tidak lagi di-cache adalah identitas user sekolah.
  let permissions = [];
  let menus = [];
  try {
    permissions = getRuntimePermissions_(role, '');
    menus = getRuntimeMenusForRole_(role);
  } catch (e) {
    // Jika directory belum tersinkron, login tetap dapat mengenali user.
    // Menu/permission akan kosong sampai directory disinkronkan.
  }

  return ok_({
    user: {
      idUser: clean_(user.id_user),
      nama: clean_(user.nama),
      email: clean_(user.email || email).toLowerCase(),
      role: role,
      idSekolah: clean_(school.id_sekolah).toUpperCase()
    },
    school: {
      idSekolah: clean_(school.id_sekolah).toUpperCase(),
      npsn: clean_(school.npsn),
      namaSekolah: clean_(school.nama_sekolah),
      spreadsheetId: clean_(school.spreadsheet_id),
      driveFolderId: clean_(school.drive_folder_id)
    },
    permissions: permissions,
    menus: menus
  }, 'Sesi aktif melalui Gateway.');
}
