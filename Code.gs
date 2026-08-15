/** Entry point SIM SATRIA Multi Sekolah. */
function doGet() {
  return HtmlService.createTemplateFromFile('ui/index')
    .evaluate()
    .setTitle(APP_CONFIG.NAME + ' v' + APP_CONFIG.VERSION)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Include file HTML.
 * CSS Agenda Mengajar seluruhnya berada di ui/css.html.
 * Referensi legacy ui/agenda.css diabaikan agar deployment lama tidak error.
 */
function include(filename) {
  const name = String(filename || '').trim();
  if (name === 'ui/agenda.css' || name === 'agenda.css') return '';
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
