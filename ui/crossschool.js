<script>
/* TAHAP 8.10 — Cross-school isolation test override.
 * Loaded after ui/js so this version replaces the older handler.
 */
function testCrossSchoolIsolation() {
  const btn = document.getElementById('testCrossSchoolBtn');
  const result = document.getElementById('gatewayTestResult');
  if (!btn || !result) return;

  const span = btn.querySelector('span');
  let finished = false;

  btn.disabled = true;
  btn.style.opacity = '0.65';
  if (span) span.textContent = 'Menguji Isolasi...';

  result.style.display = 'block';
  result.innerHTML = '<div class="card-body"><h5>TEST CROSS-SCHOOL ISOLATION</h5><p>Menghubungi server untuk menguji schoolId palsu...</p></div>';

  const resetButton = function(label) {
    btn.disabled = false;
    btn.style.opacity = '1';
    if (span) span.textContent = label || 'TEST CROSS-SCHOOL ISOLATION';
  };

  const timeoutId = setTimeout(function() {
    if (finished) return;
    finished = true;
    resetButton();
    result.innerHTML =
      '<div class="card-body">' +
        '<h5>TEST CROSS-SCHOOL ISOLATION — TIMEOUT</h5>' +
        '<p>❌ Server belum mengembalikan respons.</p>' +
        '<p>Periksa apakah <b>SetupCrossSchoolTest.js</b> sudah dipull ke Apps Script dan Web App sudah dideploy ulang.</p>' +
      '</div>';
  }, 30000);

  google.script.run
    .withSuccessHandler(function(response) {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      resetButton();

      if (!response || response.ok !== true) {
        result.innerHTML =
          '<div class="card-body">' +
            '<h5>TEST CROSS-SCHOOL ISOLATION — GAGAL</h5>' +
            '<p>❌ Pengujian gagal.</p>' +
            '<pre>' + escapeHtml(JSON.stringify(response || {}, null, 2)) + '</pre>' +
          '</div>';
        return;
      }

      const passed = response.crossSchool === 'PASS' && response.override === 'BLOCKED';
      result.innerHTML =
        '<div class="card-body">' +
          '<h5>TEST CROSS-SCHOOL ISOLATION — ' + (passed ? 'PASS' : 'GAGAL') + '</h5>' +
          '<p><b>User:</b> ' + escapeHtml(response.user) + '</p>' +
          '<p><b>Role:</b> ' + escapeHtml(response.role) + '</p>' +
          '<p><b>Actual School:</b> ' + escapeHtml(response.actualSchool) + '</p>' +
          '<p><b>Forged School:</b> ' + escapeHtml(response.forgedSchool) + '</p>' +
          '<p><b>Effective School:</b> ' + escapeHtml(response.effectiveSchool) + '</p>' +
          '<p><b>School Override:</b> ' + escapeHtml(response.override) + (response.override === 'BLOCKED' ? ' ✓' : ' ❌') + '</p>' +
          '<p><b>Cross School:</b> ' + escapeHtml(response.crossSchool) + (response.crossSchool === 'PASS' ? ' ✓' : ' ❌') + '</p>' +
          '<p><b>Gateway Write:</b> ' + escapeHtml(response.gatewayWrite || '-') + '</p>' +
          '<p><b>Target Sheet:</b> ' + escapeHtml(response.targetSheet || '-') + '</p>' +
          '<p>' + escapeHtml(response.message || 'Pengujian selesai.') + '</p>' +
        '</div>';
    })
    .withFailureHandler(function(error) {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      resetButton();
      const message = error && error.message ? error.message : String(error || 'Pengujian gagal.');
      result.innerHTML =
        '<div class="card-body">' +
          '<h5>TEST CROSS-SCHOOL ISOLATION — GAGAL</h5>' +
          '<p>❌ ' + escapeHtml(message) + '</p>' +
        '</div>';
    })
    .testGatewayCrossSchoolAsCurrentUser();
}
</script>
