const SCHOOL_DATABASE = Object.freeze({ CONFIG: 'SCHOOL_CONFIG' });
const SCHOOL_DATABASE_HEADERS = Object.freeze({
  CONFIG: ['id_sekolah','npsn','nama_sekolah','spreadsheet_id','drive_folder_id','status','initialized_at','initialized_by','app_version']
});

function initializeSchoolDatabase_(schoolId) {
  requireSetupAccess_();
  const id = clean_(schoolId).toUpperCase();
  if (!id) throw new Error('id_sekolah wajib diisi.');
  const school = findSchoolById_(id);
  if (!school) throw new Error('Sekolah tidak ditemukan atau tidak ACTIVE: ' + id);
  const spreadsheetId = clean_(school.spreadsheet_id);
  const driveFolderId = clean_(school.drive_folder_id);
  if (!spreadsheetId || !driveFolderId) throw new Error('Storage sekolah belum lengkap: ' + id);

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const folder = DriveApp.getFolderById(driveFolderId);
  if (ss.getId() !== spreadsheetId || folder.getId() !== driveFolderId) throw new Error('Storage sekolah tidak sesuai MASTER_SEKOLAH.');

  let sh = ss.getSheetByName(SCHOOL_DATABASE.CONFIG);
  if (!sh) sh = ss.insertSheet(SCHOOL_DATABASE.CONFIG);
  const headers = SCHOOL_DATABASE_HEADERS.CONFIG;
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  const actor = clean_(Session.getActiveUser().getEmail()).toLowerCase();
  const row = [id, clean_(school.npsn), clean_(school.nama_sekolah), spreadsheetId, driveFolderId, clean_(school.status).toUpperCase(), new Date(), actor, APP_CONFIG.VERSION];
  if (sh.getLastRow() < 2) sh.getRange(2,1,1,row.length).setValues([row]);
  else sh.getRange(2,1,1,row.length).setValues([row]);
  sh.setFrozenRows(1);
  return ok_({idSekolah:id,namaSekolah:clean_(school.nama_sekolah),spreadsheetId:spreadsheetId,driveFolderId:driveFolderId,configSheet:SCHOOL_DATABASE.CONFIG},'Database sekolah berhasil diinisialisasi.');
}

function getSchoolDatabaseStatus_(schoolId) {
  const id = clean_(schoolId).toUpperCase();
  const school = findSchoolById_(id);
  if (!school) throw new Error('Sekolah tidak ditemukan atau tidak ACTIVE: ' + id);
  const ss = SpreadsheetApp.openById(clean_(school.spreadsheet_id));
  const sh = ss.getSheetByName(SCHOOL_DATABASE.CONFIG);
  return ok_({idSekolah:id,spreadsheetId:ss.getId(),spreadsheetName:ss.getName(),configSheetExists:!!sh,configRows:sh ? Math.max(0,sh.getLastRow()-1) : 0},'Status database sekolah.');
}
