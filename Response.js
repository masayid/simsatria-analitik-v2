/** Format response konsisten untuk client web. */
function ok_(data, message) { return { ok: true, message: message || 'Berhasil', data: data == null ? null : data }; }
function fail_(message, code) { return { ok: false, code: code || 'ERROR', message: message || 'Terjadi kesalahan.' }; }
