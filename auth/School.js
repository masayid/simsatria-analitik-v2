/** Menentukan sekolah aktif user berdasarkan id_sekolah. */
function getCurrentSchool_() {
  const email = getCurrentUser_();
  const user = findUserByEmail_(email);
  if (!user || !user.id_sekolah) throw new Error('Sekolah user belum ditentukan.');
  const school = findSchoolById_(user.id_sekolah);
  if (!school) throw new Error('Sekolah tidak ditemukan.');
  return school;
}
