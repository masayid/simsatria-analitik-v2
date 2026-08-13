/** Identifikasi user dari akun Google yang sedang mengakses web app. */
function getCurrentUser_() {
  const email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Akun Google tidak teridentifikasi.');
  return email.toLowerCase();
}

function getSessionContext() {
  const email = getCurrentUser_();
  const user = findUserByEmail_(email);
  if (!user || String(user.aktif).toUpperCase() !== 'TRUE') throw new Error('User belum terdaftar/aktif.');
  return ok_(user);
}
