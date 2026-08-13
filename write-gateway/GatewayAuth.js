/** Validasi token gateway dan sekolah target. */
function gatewayAuthorize_(payload) {
  const expected = PropertiesService.getScriptProperties().getProperty(APP_CONFIG.PROP.GATEWAY_TOKEN);
  gatewayRequire_(expected, 'GATEWAY_TOKEN belum dikonfigurasi.');
  gatewayRequire_(gatewayClean_(payload && payload.token) === expected, 'Unauthorized gateway request.');
  gatewayRequire_(gatewayClean_(payload && payload.schoolId), 'schoolId wajib dikirim.');

  // Validasi terhadap MASTER_SEKOLAH. Hanya sekolah ACTIVE yang boleh diproses.
  gatewayGetSchool_(payload.schoolId);
}

function gatewayGetSchool_(schoolId) {
  return getSchoolConfig_(schoolId);
}
