/**
 * ADMINISTRASI MASTER DATA
 * Digunakan owner/operator saat bootstrap dan konfigurasi sekolah.
 */
function registerSchool(data) {
  requireSetupAccess_();
  requireValue_(data && data.id_sekolah, 'id_sekolah');
  requireValue_(data && data.npsn, 'npsn');
  requireValue_(data && data.nama_sekolah, 'nama_sekolah');
  requireValue_(data && data.spreadsheet_id, 'spreadsheet_id');
  requireValue_(data && data.drive_folder_id, 'drive_folder_id');

  const ss = getMasterSpreadsheet_();
  const sh = ss.getSheetByName(MASTER.SEKOLAH);
  const rows = readSheetObjects_(ss, MASTER.SEKOLAH);
  const id = clean_(data.id_sekolah);
  if (rows.some(row => clean_(row.id_sekolah) === id)) throw new Error('id_sekolah sudah terdaftar.');

  sh.appendRow([id, clean_(data.npsn), clean_(data.nama_sekolah), clean_(data.spreadsheet_id), clean_(data.drive_folder_id), 'ACTIVE']);
  return ok_({ idSekolah: id }, 'Sekolah berhasil didaftarkan.');
}

function registerUser(data) {
  requireSetupAccess_();
  requireValue_(data && data.id_user, 'id_user');
  requireValue_(data && data.id_sekolah, 'id_sekolah');
  requireValue_(data && data.nama, 'nama');
  requireValue_(data && data.email, 'email');
  requireValue_(data && data.role, 'role');

  const role = clean_(data.role).toUpperCase();
  if (!Object.values(APP_CONFIG.ROLE).includes(role)) throw new Error('Role tidak valid.');
  if (!findSchoolById_(data.id_sekolah)) throw new Error('Sekolah tidak ditemukan.');

  const ss = getMasterSpreadsheet_();
  const sh = ss.getSheetByName(MASTER.USER);
  const rows = readSheetObjects_(ss, MASTER.USER);
  const email = clean_(data.email).toLowerCase();
  if (rows.some(row => clean_(row.email).toLowerCase() === email)) throw new Error('Email user sudah terdaftar.');

  sh.appendRow([clean_(data.id_user), clean_(data.id_sekolah), clean_(data.nama), email, role, 'ACTIVE']);
  return ok_({ idUser: clean_(data.id_user), email: email }, 'User berhasil didaftarkan.');
}

function grantMenuPermission(role, menuCode, permissions) {
  requireSetupAccess_();
  const roleCode = clean_(role).toUpperCase();
  const menu = clean_(menuCode).toUpperCase();
  if (!Object.values(APP_CONFIG.ROLE).includes(roleCode)) throw new Error('Role tidak valid.');
  if (!menu) throw new Error('kode_menu wajib diisi.');
  const list = Array.isArray(permissions) ? permissions : [permissions];
  const normalized = list.map(p => clean_(p).toUpperCase());
  normalized.forEach(p => { if (!Object.values(APP_CONFIG.PERMISSION).includes(p)) throw new Error('Permission tidak valid: ' + p); });

  const ss = getMasterSpreadsheet_();
  const sh = ss.getSheetByName(MASTER.ROLE_PERMISSION);
  const existing = readSheetObjects_(ss, MASTER.ROLE_PERMISSION);
  normalized.forEach(permission => {
    const exists = existing.some(row => clean_(row.role).toUpperCase() === roleCode && clean_(row.kode_menu).toUpperCase() === menu && clean_(row.permission).toUpperCase() === permission);
    if (!exists) sh.appendRow([roleCode, menu, permission, 'TRUE']);
  });
  return ok_({ role: roleCode, menu: menu, permissions: normalized }, 'Permission menu berhasil diberikan.');
}

function addMenu(menu) {
  requireSetupAccess_();
  requireValue_(menu && menu.kode_menu, 'kode_menu');
  requireValue_(menu && menu.nama_menu, 'nama_menu');
  const ss = getMasterSpreadsheet_();
  const sh = ss.getSheetByName(MASTER.MENU);
  const code = clean_(menu.kode_menu).toUpperCase();
  if (readSheetObjects_(ss, MASTER.MENU).some(row => clean_(row.kode_menu).toUpperCase() === code)) throw new Error('Menu sudah terdaftar.');
  sh.appendRow([code, clean_(menu.nama_menu), clean_(menu.parent_id), Number(menu.urutan || 99), clean_(menu.icon), 'TRUE']);
  return ok_({ kodeMenu: code }, 'Menu berhasil ditambahkan.');
}

function requireSetupAccess_() {
  const configured = PropertiesService.getScriptProperties().getProperty('SETUP_OWNER_EMAIL');
  const effective = Session.getEffectiveUser().getEmail().toLowerCase();
  if (configured && effective !== configured.toLowerCase()) throw new Error('Hanya SETUP_OWNER_EMAIL yang dapat mengubah MASTER.');
  return true;
}
