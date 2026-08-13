/**
 * SIM SATRIA Multi Sekolah - entry point.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('05_UI/index')
    .evaluate()
    .setTitle(SATRIA_CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
