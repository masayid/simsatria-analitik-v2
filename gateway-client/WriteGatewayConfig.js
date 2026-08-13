/** Konfigurasi client ke Write Gateway. */
function getGatewayConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {
    url: p.getProperty(APP_CONFIG.PROP.GATEWAY_URL),
    token: p.getProperty(APP_CONFIG.PROP.GATEWAY_TOKEN)
  };
}
