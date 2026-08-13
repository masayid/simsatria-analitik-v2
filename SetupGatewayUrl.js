/** Setup helper: isi URL gateway di konstanta berikut sebelum Run. */
const GATEWAY_SETUP_URL = 'GANTI_DENGAN_URL_GATEWAY_/exec';

function setup14b_setGatewayUrl() {
  requireSetupAccess_();
  const value = clean_(GATEWAY_SETUP_URL);
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec$/.test(value)) {
    throw new Error('Isi GATEWAY_SETUP_URL dengan URL Web App gateway yang berakhiran /exec.');
  }
  PropertiesService.getScriptProperties().setProperty(APP_CONFIG.PROP.GATEWAY_URL, value);
  return ok_({configured: true}, 'GATEWAY_URL tersimpan.');
}
