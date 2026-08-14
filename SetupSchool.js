/** SIM SATRIA Multi Sekolah - TAHAP 8 runner. */
function setup21_initializeSchoolDatabase() {
  const schoolId = 'SMANTI03PWJ';
  const result = initializeSchoolDatabase_(schoolId);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function setup22_checkSchoolDatabase() {
  const schoolId = 'SMANTI03PWJ';
  const result = getSchoolDatabaseStatus_(schoolId);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
