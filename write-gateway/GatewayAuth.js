/** Validasi token gateway dan batas sekolah. */
function gatewayAuthorize_(payload) {
  const expected = PropertiesService.getScriptProperties().getProperty('GATEWAY_TOKEN');
  if (!expected || gatewayClean_(payload.token) !== expected) throw new Error('Unauthorized gateway request.');
  requireGatewaySchool_(payload.schoolId);
}
function requireGatewaySchool_(schoolId) {
  const allowed = PropertiesService.getScriptProperties().getProperty('ALLOWED_SCHOOL_IDS') || '';
  if (allowed && allowed.split(',').map(gatewayClean_).indexOf(gatewayClean_(schoolId)) < 0) throw new Error('Sekolah tidak diizinkan.');
}
