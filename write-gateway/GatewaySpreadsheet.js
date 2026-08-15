/** Operasi spreadsheet melalui Gateway. */
function gatewayEnsureSheet_(schoolId, sheetName, headers) {
  const name = gatewayClean_(sheetName).toUpperCase();
  const allowedCreate = ['KELAS','GURU'];
  gatewayRequire_(allowedCreate.indexOf(name) >= 0, 'Gateway hanya dapat membuat sheet KELAS atau GURU.');

  const requestedHeaders = Array.isArray(headers) ? headers.map(gatewayClean_).filter(Boolean) : [];
  gatewayRequire_(requestedHeaders.length > 0, 'Header sheet wajib dikirim.');

  const ss = gatewayGetSpreadsheet_(schoolId);
  let sh = ss.getSheetByName(name);
  const created = !sh;
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, requestedHeaders.length).setValues([requestedHeaders]);
  } else {
    const current = sh.getRange(1, 1, 1, Math.max(requestedHeaders.length, sh.getLastColumn()))
      .getDisplayValues()[0].slice(0, requestedHeaders.length).map(gatewayClean_);
    const same = requestedHeaders.every(function(header, index) {
      return String(current[index] || '').toUpperCase() === String(header).toUpperCase();
    });
    gatewayRequire_(same, 'Struktur sheet ' + name + ' tidak sesuai. Header wajib: ' + requestedHeaders.join(', '));
  }

  sh.setFrozenRows(1);
  const props = PropertiesService.getScriptProperties();
  const propName = 'GATEWAY_SHEETS_' + gatewayClean_(schoolId).toUpperCase();
  const currentAllowed = (props.getProperty(propName) || '').split(',').map(gatewayClean_).filter(Boolean);
  if (currentAllowed.indexOf(name) < 0) {
    currentAllowed.push(name);
    props.setProperty(propName, currentAllowed.join(','));
  }

  return {schoolId:gatewayClean_(schoolId).toUpperCase(),sheet:name,created:created,headers:requestedHeaders,rows:Math.max(0,sh.getLastRow()-1)};
}

function gatewayAppend_(schoolId, sheetName, row) {
  const name = gatewayClean_(sheetName);
  gatewayRequire_(name, 'Sheet tujuan wajib dikirim.');
  const values = gatewayNormalizeRow_(row);
  const ss = gatewayGetSpreadsheet_(schoolId);
  const sh = ss.getSheetByName(name);
  gatewayRequire_(sh, 'Sheet tujuan tidak ditemukan: ' + name);
  sh.appendRow(values);
  return {schoolId:gatewayClean_(schoolId).toUpperCase(),sheet:name,row:sh.getLastRow()};
}

function gatewayUpdateRow_(schoolId, sheetName, rowNumber, row) {
  const name = gatewayClean_(sheetName),rowNo=Number(rowNumber);
  gatewayRequire_(name, 'Sheet tujuan wajib dikirim.');
  gatewayRequire_(rowNo>=2 && isFinite(rowNo), 'Nomor baris tidak valid.');
  const values=gatewayNormalizeRow_(row),ss=gatewayGetSpreadsheet_(schoolId),sh=ss.getSheetByName(name);
  gatewayRequire_(sh, 'Sheet tujuan tidak ditemukan: ' + name);
  gatewayRequire_(rowNo<=sh.getLastRow(), 'Baris data tidak ditemukan.');
  sh.getRange(rowNo,1,1,values.length).setValues([values]);
  return {schoolId:gatewayClean_(schoolId).toUpperCase(),sheet:name,row:rowNo};
}

function gatewayDeleteRow_(schoolId, sheetName, rowNumber) {
  const name=gatewayClean_(sheetName),rowNo=Number(rowNumber);
  gatewayRequire_(name, 'Sheet tujuan wajib dikirim.');
  gatewayRequire_(rowNo>=2 && isFinite(rowNo), 'Nomor baris tidak valid.');
  const ss=gatewayGetSpreadsheet_(schoolId),sh=ss.getSheetByName(name);
  gatewayRequire_(sh, 'Sheet tujuan tidak ditemukan: ' + name);
  gatewayRequire_(rowNo<=sh.getLastRow(), 'Baris data tidak ditemukan.');
  sh.deleteRow(rowNo);
  return {schoolId:gatewayClean_(schoolId).toUpperCase(),sheet:name,row:rowNo};
}

function gatewayReadSheet_(schoolId, sheetName) {
  const name=gatewayClean_(sheetName),ss=gatewayGetSpreadsheet_(schoolId),sh=ss.getSheetByName(name);
  if(!sh)return {schoolId:gatewayClean_(schoolId).toUpperCase(),sheet:name,exists:false,values:[]};
  const lastRow=sh.getLastRow(),lastColumn=sh.getLastColumn();
  const values=(lastRow>0&&lastColumn>0)?sh.getRange(1,1,lastRow,lastColumn).getDisplayValues():[];
  return {schoolId:gatewayClean_(schoolId).toUpperCase(),sheet:name,exists:true,values:values};
}
