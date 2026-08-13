/**
 * KONFIGURASI UTAMA SIM SATRIA MULTI SEKOLAH.
 * ID/URL/token disimpan di Script Properties, bukan di source code.
 */
const APP_CONFIG = Object.freeze({
  NAME: 'SIM SATRIA Multi Sekolah',
  VERSION: '2.2.0',
  TIMEZONE: 'Asia/Jakarta',
  PROP: {
    MASTER_SPREADSHEET_ID: 'MASTER_SPREADSHEET_ID',
    SETUP_OWNER_EMAIL: 'SETUP_OWNER_EMAIL',
    SCHOOL_ID: 'SAT_schoolId',
    GATEWAY_URL: 'SAT_gatewayUrl',
    GATEWAY_TOKEN: 'SAT_gatewayToken'
  },
  ROLE: {
    ADMIN_SEKOLAH: 'ADMIN_SEKOLAH',
    GURU: 'GURU',
    WALI_KELAS: 'WALI_KELAS',
    KARYAWAN: 'KARYAWAN',
    SISWA: 'SISWA'
  },
  PERMISSION: {
    READ: 'READ',
    INPUT: 'INPUT',
    UPLOAD: 'UPLOAD',
    PDF: 'PDF',
    ADMIN: 'ADMIN'
  },
  STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
  }
});
