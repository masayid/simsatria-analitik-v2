/** Utilitas umum: normalisasi, validasi, dan object helper. */
function clean_(v) { return v == null ? '' : String(v).trim(); }
function now_() { return new Date(); }
function requireValue_(v, name) { if (!clean_(v)) throw new Error(name + ' wajib diisi.'); return v; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function safeJsonParse_(value) { try { return JSON.parse(value); } catch (e) { throw new Error('Payload JSON tidak valid.'); } }
