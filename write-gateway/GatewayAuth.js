/** Validasi token gateway dan sekolah target. */
function gatewayAuthorize_(payload) {
  const expected = PropertiesService.getScriptProperties().getProperty(GATEWAY_CONFIG.PROP.GATEWAY_TOKEN);
  gatewayRequire_(expected, 'GATEWAY_TOKEN belum dikonfigurasi pada Write Gateway.');
  gatewayRequire_(gatewayClean_(payload && payload.token) === expected, 'Unauthorized gateway request.');

  const action = gatewayClean_(payload && payload.action).toUpperCase();

  // AUTH_LOOKUP_USER memang tidak menerima schoolId dari client.
  // Gateway menentukan sekolah berdasarkan USERS/MASTER_USER.
  if (action === 'AUTH_LOOKUP_USER') return true;

  gatewayRequire_(gatewayClean_(payload && payload.schoolId), 'schoolId wajib dikirim.');

  // Validasi terhadap MASTER_SEKOLAH. Hanya sekolah ACTIVE yang boleh diproses.
  gatewayGetSchool_(payload.schoolId);
  return true;
}

function gatewayGetSchool_(schoolId) {
  return getSchoolConfig_(schoolId);
}
