/** Identifikasi user dari akun Google yang sedang mengakses web app. */
function getCurrentUser_() {
  const email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Akun Google tidak teridentifikasi. Pastikan deployment web app menggunakan akun/domain yang benar.');
  return email.toLowerCase();
}

function getSessionContext() {
  const email = getCurrentUser_();
  const user = findUserByEmail_(email);
  if (!user || clean_(user.status).toUpperCase() !== 'ACTIVE') {
    throw new Error('User belum terdaftar atau status user tidak ACTIVE.');
  }

  const role = clean_(user.role).toUpperCase();
  const school = findSchoolById_(user.id_sekolah);
  if (!school) throw new Error('Sekolah user belum terdaftar atau tidak aktif.');

  return ok_({
    user: {
      idUser: clean_(user.id_user),
      nama: clean_(user.nama),
      email: email,
      role: role,
      idSekolah: clean_(user.id_sekolah)
    },
    school: {
      idSekolah: clean_(school.id_sekolah),
      npsn: clean_(school.npsn),
      namaSekolah: clean_(school.nama_sekolah),
      spreadsheetId: clean_(school.spreadsheet_id),
      driveFolderId: clean_(school.drive_folder_id)
    },
    permissions: getPermissions_(role, ''),
    menus: getMenusForRole_(role)
  }, 'Sesi aktif.');
}
