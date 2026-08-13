/** Resolver role user. */
function getCurrentRole_() {
  const email = getCurrentUser_();
  const user = findUserByEmail_(email);
  if (!user) throw new Error('Role user tidak ditemukan.');
  return clean_(user.role).toUpperCase();
}
