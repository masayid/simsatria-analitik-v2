/**
 * RUNTIME AUTH DIRECTORY
 *
 * Runtime Web App berjalan sebagai USER_ACCESSING.
 *
 * SUMBER USER OTORITATIF:
 * - OWNER        : Script Property SETUP_OWNER_EMAIL
 * - ADMIN_SEKOLAH: MASTER_USER
 * - USER SEKOLAH : sheet USERS pada Spreadsheet sekolah masing-masing
 *
 * MASTER_USER TIDAK BOLEH menjadi sumber GURU/KARYAWAN/SISWA/WALI_KELAS.
 *
 * SETUP_OWNER melakukan sinkronisasi data ke Script Properties agar runtime
 * tidak perlu membaca MASTER Spreadsheet setiap request user biasa.
 */
const RUNTIME_AUTH_PROP = Object.freeze({
  USERS: 'RUNTIME_AUTH_USERS_V1',
  SCHOOLS: 'RUNTIME_AUTH_SCHOOLS_V1',
  ROLE_PERMISSIONS: 'RUNTIME_AUTH_ROLE_PERMISSIONS_V1',
  MENUS: 'RUNTIME_AUTH_MENUS_V1',
  SYNCED_AT: 'RUNTIME_AUTH_SYNCED_AT_V1'
});

/**
 * Sinkronisasi MANUAL dari Apps Script Editor sebagai SETUP_OWNER.
 *
 * Penting:
 * getAllSchoolUsers_() hanya mengambil:
 *   1. ADMIN_SEKOLAH dari MASTER_USER
 *   2. user sekolah dari sheet USERS masing-masing sekolah aktif
 *
 * Dengan demikian email yang hanya ada di MASTER_USER dengan role GURU,
 * KARYAWAN, SISWA, atau WALI_KELAS TIDAK akan masuk Runtime Auth Directory.
 */
function setup29_syncRuntimeAuthDirectory() {
  requireSetupAccess_();

  const master = getMasterSpreadsheet_();

  // USER runtime berasal dari sumber yang benar:
  // ADMIN_SEKOLAH -> MASTER_USER
  // user sekolah  -> USERS masing-masing Spreadsheet sekolah.
  const users = getAllSchoolUsers_().map(function(row) {
    return {
      id_user: clean_(row.id_user),
      id_sekolah: clean_(row.id_sekolah).toUpperCase(),
      nama: clean_(row.nama),
      email: clean_(row.email).toLowerCase(),
      role: clean_(row.role).toUpperCase(),
      status: clean_(row.status).toUpperCase()
    };
  }).filter(function(row) {
    return row.email && row.id_sekolah && row.status !== APP_CONFIG.STATUS.INACTIVE;
  });

  const schools = readSheetObjects_(master, MASTER.SEKOLAH).map(function(row) {
    return {
      id_sekolah: clean_(row.id_sekolah).toUpperCase(),
      npsn: clean_(row.npsn),
      nama_sekolah: clean_(row.nama_sekolah),
      spreadsheet_id: clean_(row.spreadsheet_id),
      drive_folder_id: clean_(row.drive_folder_id),
      status: clean_(row.status).toUpperCase()
    };
  });

  const rolePermissions = readSheetObjects_(master, MASTER.ROLE_PERMISSION).map(function(row) {
    return {
      role: clean_(row.role).toUpperCase(),
      kode_menu: clean_(row.kode_menu).toUpperCase(),
      permission: clean_(row.permission).toUpperCase(),
      aktif: clean_(row.aktif).toUpperCase()
    };
  });

  const menus = readSheetObjects_(master, MASTER.MENU).map(function(row) {
    return {
      kode_menu: clean_(row.kode_menu).toUpperCase(),
      nama_menu: clean_(row.nama_menu),
      parent_id: clean_(row.parent_id),
      urutan: Number(row.urutan || 0),
      icon: clean_(row.icon),
      aktif: clean_(row.aktif).toUpperCase()
    };
  });

  const props = PropertiesService.getScriptProperties();
  props.setProperty(RUNTIME_AUTH_PROP.USERS, JSON.stringify(users));
  props.setProperty(RUNTIME_AUTH_PROP.SCHOOLS, JSON.stringify(schools));
  props.setProperty(RUNTIME_AUTH_PROP.ROLE_PERMISSIONS, JSON.stringify(rolePermissions));
  props.setProperty(RUNTIME_AUTH_PROP.MENUS, JSON.stringify(menus));
  props.setProperty(RUNTIME_AUTH_PROP.SYNCED_AT, new Date().toISOString());

  const result = {
    ok: true,
    users: users.length,
    activeUsers: users.filter(function(u) { return u.status === 'ACTIVE'; }).length,
    adminSekolah: users.filter(function(u) { return u.role === APP_CONFIG.ROLE.ADMIN_SEKOLAH; }).length,
    schoolUsers: users.filter(function(u) { return u.role !== APP_CONFIG.ROLE.ADMIN_SEKOLAH; }).length,
    schools: schools.length,
    activeSchools: schools.filter(function(s) { return s.status === APP_CONFIG.STATUS.ACTIVE; }).length,
    rolePermissions: rolePermissions.length,
    menus: menus.length,
    syncedAt: props.getProperty(RUNTIME_AUTH_PROP.SYNCED_AT),
    message: 'Runtime Auth Directory berhasil disinkronkan: ADMIN_SEKOLAH dari MASTER_USER, user sekolah dari USERS masing-masing sekolah.'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function getRuntimeAuthDirectory_() {
  const props = PropertiesService.getScriptProperties();
  const usersJson = props.getProperty(RUNTIME_AUTH_PROP.USERS);
  const schoolsJson = props.getProperty(RUNTIME_AUTH_PROP.SCHOOLS);
  const permissionsJson = props.getProperty(RUNTIME_AUTH_PROP.ROLE_PERMISSIONS);
  const menusJson = props.getProperty(RUNTIME_AUTH_PROP.MENUS);

  if (!usersJson || !schoolsJson || !permissionsJson || !menusJson) {
    throw new Error(
      'Runtime Auth Directory belum disinkronkan. ' +
      'Jalankan setup29_syncRuntimeAuthDirectory() sebagai SETUP_OWNER.'
    );
  }

  try {
    return {
      users: JSON.parse(usersJson),
      schools: JSON.parse(schoolsJson),
      rolePermissions: JSON.parse(permissionsJson),
      menus: JSON.parse(menusJson)
    };
  } catch (e) {
    throw new Error(
      'Runtime Auth Directory rusak. ' +
      'Jalankan ulang setup29_syncRuntimeAuthDirectory().'
    );
  }
}

function getRuntimeUserByEmail_(email) {
  const target = clean_(email).toLowerCase();
  return getRuntimeAuthDirectory_().users.find(function(row) {
    return clean_(row.email).toLowerCase() === target;
  }) || null;
}

function getRuntimeSchoolById_(id) {
  const target = clean_(id).toUpperCase();
  return getRuntimeAuthDirectory_().schools.find(function(row) {
    return clean_(row.id_sekolah).toUpperCase() === target &&
      clean_(row.status).toUpperCase() !== APP_CONFIG.STATUS.INACTIVE;
  }) || null;
}

function getRuntimePermissions_(role, menu) {
  const roleCode = clean_(role).toUpperCase();
  const menuCode = clean_(menu).toUpperCase();

  return getRuntimeAuthDirectory_().rolePermissions
    .filter(function(row) {
      return clean_(row.role).toUpperCase() === roleCode;
    })
    .filter(function(row) {
      return !menuCode || clean_(row.kode_menu).toUpperCase() === menuCode;
    })
    .filter(function(row) {
      return clean_(row.aktif).toUpperCase() !== 'FALSE';
    })
    .map(function(row) {
      return clean_(row.permission).toUpperCase();
    });
}

function getRuntimeMenusForRole_(role) {
  const roleCode = clean_(role).toUpperCase();
  const directory = getRuntimeAuthDirectory_();

  const readableMenus = new Set(
    directory.rolePermissions
      .filter(function(row) {
        return clean_(row.role).toUpperCase() === roleCode;
      })
      .filter(function(row) {
        return clean_(row.permission).toUpperCase() === APP_CONFIG.PERMISSION.READ;
      })
      .filter(function(row) {
        return clean_(row.aktif).toUpperCase() !== 'FALSE';
      })
      .map(function(row) {
        return clean_(row.kode_menu).toUpperCase();
      })
  );

  return directory.menus
    .filter(function(row) {
      return clean_(row.aktif).toUpperCase() !== 'FALSE';
    })
    .filter(function(row) {
      return readableMenus.has(clean_(row.kode_menu).toUpperCase());
    })
    .sort(function(a, b) {
      return Number(a.urutan || 0) - Number(b.urutan || 0);
    });
}

function getRuntimeAuthStatus() {
  const props = PropertiesService.getScriptProperties();
  const configured = !!(
    props.getProperty(RUNTIME_AUTH_PROP.USERS) &&
    props.getProperty(RUNTIME_AUTH_PROP.SCHOOLS) &&
    props.getProperty(RUNTIME_AUTH_PROP.ROLE_PERMISSIONS) &&
    props.getProperty(RUNTIME_AUTH_PROP.MENUS)
  );

  return ok_({
    configured: configured,
    syncedAt: props.getProperty(RUNTIME_AUTH_PROP.SYNCED_AT) || '',
    message: configured
      ? 'Runtime Auth Directory siap.'
      : 'Runtime Auth Directory belum siap.'
  });
}
