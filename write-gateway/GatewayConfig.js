/**
 * Konfigurasi internal WRITE GATEWAY.
 * Project Gateway berdiri sendiri dan tidak bergantung pada APP_CONFIG
 * milik project SIM SATRIA client.
 */
const GATEWAY_CONFIG = Object.freeze({
  PROP: {
    GATEWAY_TOKEN: 'SAT_gatewayToken',
    MASTER_SPREADSHEET_ID: 'MASTER_SPREADSHEET_ID'
  },
  STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
  },
  MAX_UPLOAD_BYTES: 10 * 1024 * 1024,
  ALLOWED_ACTIONS: [
    'SPREADSHEET_APPEND',
    'DRIVE_UPLOAD',
    'PDF_CREATE'
  ]
});
