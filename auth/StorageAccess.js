/**
 * SIM SATRIA Multi Sekolah — STORAGE ACCESS
 *
 * TAHAP 6:
 * Menetapkan akses Google Spreadsheet dan Google Drive sekolah
 * berdasarkan ROLE aplikasi.
 *
 * POLA:
 * ADMIN_SEKOLAH -> Editor
 * GURU          -> Viewer
 * WALI_KELAS    -> Viewer
 * KARYAWAN      -> Viewer
 * SISWA         -> Viewer
 *
 * Catatan:
 * - Fungsi ini dijalankan oleh SETUP_OWNER dari Apps Script Editor.
 * - Tidak mengubah akses MASTER Spreadsheet.
 * - Tidak menghapus owner/pemilik file.
 * - Tidak mengubah permission aplikasi INPUT/UPLOAD/PDF.
 * - INPUT/UPLOAD/PDF tetap dikendalikan oleh Application Permission
 *   dan Write Gateway.
 */

function getStorageAccessPolicy_(role) {
  const roleCode = clean_(role).toUpperCase();

  if (roleCode === APP_CONFIG.ROLE.ADMIN_SEKOLAH) {
    return {
      role: roleCode,
      spreadsheet: 'EDITOR',
      drive: 'EDITOR'
    };
  }

  if (Object.values(APP_CONFIG.ROLE).includes(roleCode)) {
    return {
      role: roleCode,
      spreadsheet: 'VIEWER',
      drive: 'VIEWER'
    };
  }

  throw new Error('Role storage tidak valid: ' + roleCode);
}

function applyStorageAccessForUser_(user, school) {
  const email = clean_(user.email).toLowerCase();
  const policy = getStorageAccessPolicy_(user.role);

  if (!email || !email.includes('@')) {
    throw new Error('Email user tidak valid: ' + email);
  }

  if (!school || !school.spreadsheet_id || !school.drive_folder_id) {
    throw new Error('Konfigurasi storage sekolah belum lengkap.');
  }

  const spreadsheetFile = DriveApp.getFileById(clean_(school.spreadsheet_id));
  const driveFolder = DriveApp.getFolderById(clean_(school.drive_folder_id));

  if (policy.spreadsheet === 'EDITOR') {
    spreadsheetFile.addEditor(email);
  } else {
    spreadsheetFile.addViewer(email);
  }

  if (policy.drive === 'EDITOR') {
    driveFolder.addEditor(email);
  } else {
    driveFolder.addViewer(email);
  }

  return {
    idUser: clean_(user.id_user),
    email: email,
    role: policy.role,
    spreadsheetAccess: policy.spreadsheet,
    driveAccess: policy.drive,
    spreadsheetId: spreadsheetFile.getId(),
    driveFolderId: driveFolder.getId()
  };
}

/**
 * Terapkan akses storage untuk satu user berdasarkan MASTER_USER.
 * Hanya SETUP_OWNER yang boleh menjalankan.
 */
function applyStorageAccessForUser(email) {
  requireSetupAccess_();

  const user = findUserByEmail_(email);
  if (!user) throw new Error('User tidak ditemukan: ' + email);

  const school = findSchoolById_(user.id_sekolah);
  if (!school) throw new Error('Sekolah user tidak ditemukan atau tidak ACTIVE.');

  return ok_(
    applyStorageAccessForUser_(user, school),
    'Akses storage user berhasil diterapkan.'
  );
}

/**
 * Terapkan akses storage untuk seluruh user ACTIVE dalam satu sekolah.
 */
function applyStorageAccessForSchool(idSekolah) {
  requireSetupAccess_();

  const schoolId = clean_(idSekolah).toUpperCase();
  const school = findSchoolById_(schoolId);
  if (!school) throw new Error('Sekolah tidak ditemukan atau tidak ACTIVE: ' + schoolId);

  const users = readSheetObjects_(getMasterSpreadsheet_(), MASTER.USER)
    .filter(row => clean_(row.id_sekolah).toUpperCase() === schoolId)
    .filter(row => clean_(row.status).toUpperCase() !== APP_CONFIG.STATUS.INACTIVE);

  const results = [];

  users.forEach(user => {
    try {
      results.push({
        ok: true,
        data: applyStorageAccessForUser_(user, school)
      });
    } catch (error) {
      results.push({
        ok: false,
        idUser: clean_(user.id_user),
        email: clean_(user.email).toLowerCase(),
        role: clean_(user.role).toUpperCase(),
        message: error && error.message ? error.message : String(error)
      });
    }
  });

  return ok_({
    schoolId: schoolId,
    schoolName: clean_(school.nama_sekolah),
    totalUsers: users.length,
    success: results.filter(item => item.ok).length,
    failed: results.filter(item => !item.ok).length,
    results: results
  }, 'Akses storage sekolah selesai diterapkan.');
}

/**
 * Verifikasi akses yang terdaftar pada Spreadsheet dan Drive.
 * Tidak menampilkan seluruh daftar user Drive; hanya memeriksa user
 * yang terdaftar di MASTER_USER.
 */
function verifyStorageAccessForSchool(idSekolah) {
  requireSetupAccess_();

  const schoolId = clean_(idSekolah).toUpperCase();
  const school = findSchoolById_(schoolId);
  if (!school) throw new Error('Sekolah tidak ditemukan atau tidak ACTIVE: ' + schoolId);

  const spreadsheetFile = DriveApp.getFileById(clean_(school.spreadsheet_id));
  const driveFolder = DriveApp.getFolderById(clean_(school.drive_folder_id));

  const users = readSheetObjects_(getMasterSpreadsheet_(), MASTER.USER)
    .filter(row => clean_(row.id_sekolah).toUpperCase() === schoolId)
    .filter(row => clean_(row.status).toUpperCase() !== APP_CONFIG.STATUS.INACTIVE);

  const editorsSpreadsheet = new Set(spreadsheetFile.getEditors().map(u => u.getEmail().toLowerCase()));
  const viewersSpreadsheet = new Set(spreadsheetFile.getViewers().map(u => u.getEmail().toLowerCase()));
  const editorsDrive = new Set(driveFolder.getEditors().map(u => u.getEmail().toLowerCase()));
  const viewersDrive = new Set(driveFolder.getViewers().map(u => u.getEmail().toLowerCase()));

  const results = users.map(user => {
    const email = clean_(user.email).toLowerCase();
    const policy = getStorageAccessPolicy_(user.role);

    const spreadsheetOk = policy.spreadsheet === 'EDITOR'
      ? editorsSpreadsheet.has(email)
      : (editorsSpreadsheet.has(email) || viewersSpreadsheet.has(email));

    const driveOk = policy.drive === 'EDITOR'
      ? editorsDrive.has(email)
      : (editorsDrive.has(email) || viewersDrive.has(email));

    return {
      idUser: clean_(user.id_user),
      email: email,
      role: clean_(user.role).toUpperCase(),
      expectedSpreadsheet: policy.spreadsheet,
      expectedDrive: policy.drive,
      spreadsheetOk: spreadsheetOk,
      driveOk: driveOk,
      ok: spreadsheetOk && driveOk
    };
  });

  return ok_({
    schoolId: schoolId,
    schoolName: clean_(school.nama_sekolah),
    spreadsheetId: spreadsheetFile.getId(),
    driveFolderId: driveFolder.getId(),
    totalUsers: results.length,
    success: results.filter(item => item.ok).length,
    failed: results.filter(item => !item.ok).length,
    results: results
  }, 'Verifikasi akses storage selesai.');
}
