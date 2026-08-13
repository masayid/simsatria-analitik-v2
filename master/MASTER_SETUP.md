# MASTER Setup Operasional — SIM SATRIA Multi Sekolah

Tahap 5 digunakan untuk menyiapkan Spreadsheet MASTER pusat sebelum storage access dan migrasi menu.

## 1. Siapkan Spreadsheet MASTER

Buat satu Google Spreadsheet pusat, misalnya:

`SIM SATRIA MASTER`

Salin ID Spreadsheet tersebut.

## 2. Set MASTER_SPREADSHEET_ID

Buka Apps Script project aplikasi dan jalankan **manual dari editor Apps Script**:

```javascript
setMasterSpreadsheetId_('SPREADSHEET_ID_MASTER');
```

Fungsi setup-only ini menyimpan ID ke Script Properties, bukan ke source code.

## 3. Kunci SETUP_OWNER_EMAIL

Jalankan manual dari editor:

```javascript
setSetupOwnerEmail_('admin@example.sch.id');
```

Gunakan akun operator yang memang akan mengelola MASTER.

Fungsi setup-only ini sengaja memakai suffix `_` agar tidak tersedia sebagai fungsi client `google.script.run`.

## 4. Inisialisasi MASTER

Jalankan manual dari editor:

```javascript
initializeSystem_();
```

Aplikasi akan membuat sheet:

- MASTER_SEKOLAH
- MASTER_USER
- MASTER_ROLE
- MASTER_PERMISSION
- MASTER_ROLE_PERMISSION
- MASTER_MENU

Sekaligus melakukan seed role, permission, Dashboard, dan permission Dashboard.

## 5. Daftarkan sekolah

Setelah setup owner aktif, sekolah dapat didaftarkan melalui fungsi server:

```javascript
registerSchool({
  id_sekolah: 'SMANDA2SKJ',
  npsn: '20306175',
  nama_sekolah: 'SMA Negeri 2 Sukorejo',
  spreadsheet_id: 'ID_SPREADSHEET_SEKOLAH',
  drive_folder_id: 'ID_FOLDER_DRIVE_SEKOLAH'
});
```

Saat registrasi, sistem memvalidasi Spreadsheet sekolah dan Folder Drive dengan akun yang sedang menjalankan operasi setup.

## 6. Daftarkan user

Contoh ADMIN_SEKOLAH:

```javascript
registerUser({
  id_user: 'U001',
  id_sekolah: 'SMANDA2SKJ',
  nama: 'Nama Admin',
  email: 'admin@example.sch.id',
  role: 'ADMIN_SEKOLAH'
});
```

Contoh GURU:

```javascript
registerUser({
  id_user: 'U002',
  id_sekolah: 'SMANDA2SKJ',
  nama: 'Nama Guru',
  email: 'guru@example.sch.id',
  role: 'GURU'
});
```

## 7. Tambahkan menu

Contoh:

```javascript
addMenu({
  kode_menu: 'AGENDA_GURU',
  nama_menu: 'Agenda Mengajar',
  parent_id: '',
  urutan: 10,
  icon: 'calendar'
});
```

## 8. Berikan permission menu

Contoh semua operasi untuk GURU:

```javascript
grantMenuPermission('GURU', 'AGENDA_GURU', [
  'READ',
  'INPUT',
  'UPLOAD',
  'PDF'
]);
```

ADMIN_SEKOLAH:

```javascript
grantMenuPermission('ADMIN_SEKOLAH', 'AGENDA_GURU', [
  'READ',
  'INPUT',
  'UPLOAD',
  'PDF',
  'ADMIN'
]);
```

WALI_KELAS, KARYAWAN, dan SISWA dapat diberikan permission sesuai kebutuhan menu.

## 9. Pemeriksaan

Status setup:

```javascript
getSetupStatus();
```

Status aplikasi:

```javascript
getSystemStatus();
```

Ringkasan MASTER:

```javascript
getMasterSummary();
```

Daftar sekolah:

```javascript
listMasterSchools();
```

Daftar user:

```javascript
listMasterUsers('SMANDA2SKJ');
```

Daftar menu:

```javascript
listMasterMenus();
```

Permission role:

```javascript
listRolePermissions('GURU');
```

## 10. Keamanan

1. Jangan menaruh ID Spreadsheet, ID Folder Drive, token, atau URL gateway di source code.
2. Jangan menjadikan GURU/WALI_KELAS/KARYAWAN/SISWA sebagai Editor hanya agar aplikasi dapat menyimpan data.
3. Permission INPUT/UPLOAD/PDF adalah permission aplikasi dan diverifikasi server-side.
4. Storage access Editor/Viewer akan dikerjakan pada Tahap 6.
5. Fungsi setup awal yang berakhiran `_` dijalankan manual dari editor Apps Script.
6. Fungsi administrasi MASTER menggunakan `Session.getActiveUser()` sehingga deployment **Execute as me** tidak membuat semua pemanggil dianggap sebagai setup owner.
7. Jangan menghapus MASTER_ROLE_PERMISSION secara manual untuk mengatasi error aplikasi; gunakan fungsi grant/revoke atau konfigurasi terkontrol.
8. `resetSetupOwnerEmail_()` hanya digunakan dari editor Apps Script pada kondisi administrasi khusus.
