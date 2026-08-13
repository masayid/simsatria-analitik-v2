# SIM SATRIA Multi Sekolah

Arsitektur Apps Script multi-school dengan kontrol akses berbasis **Role + Permission + School Scope**.

## Urutan implementasi

### Tahap 1 — Bootstrap MASTER
1. Buat satu Google Spreadsheet pusat untuk MASTER.
2. Jalankan `setMasterSpreadsheetId('SPREADSHEET_ID')`.
3. Jalankan `initializeSystem()`.
4. Pastikan sheet berikut terbentuk:
   - MASTER_SEKOLAH
   - MASTER_USER
   - MASTER_ROLE
   - MASTER_PERMISSION
   - MASTER_ROLE_PERMISSION
   - MASTER_MENU

### Tahap 2 — Registrasi sekolah dan user
Set `SETUP_OWNER_EMAIL` pada Script Properties, kemudian jalankan:

```javascript
registerSchool({
  id_sekolah: 'SMANDA2SKJ',
  npsn: 'NPSN_SEKOLAH',
  nama_sekolah: 'Nama Sekolah',
  spreadsheet_id: 'ID_SPREADSHEET_SEKOLAH',
  drive_folder_id: 'ID_FOLDER_DRIVE'
});

registerUser({
  id_user: 'U001',
  id_sekolah: 'SMANDA2SKJ',
  nama: 'Nama Pengguna',
  email: 'user@domain.sch.id',
  role: 'GURU'
});
```

### Tahap 3 — Login, role, dan school scope
Web app memanggil `getSessionContext()`.

Server menentukan:

`Google Account → MASTER_USER → ROLE → SCHOOL → MENU/PERMISSION`

Tidak ada client-side role yang dipercaya sebagai sumber otoritas.

### Tahap 4 — Write Gateway
Deploy folder `write-gateway` sebagai Web App terpisah.

Script Properties gateway:

- `GATEWAY_TOKEN`
- `ALLOWED_SCHOOL_IDS`
- `SCHOOL_<ID_SEKOLAH>` = Spreadsheet ID sekolah
- `DRIVE_<ID_SEKOLAH>` = Folder Drive sekolah
- `SHEETS_<ID_SEKOLAH>` = comma-separated allowlist sheet yang boleh ditulis

Client application menyimpan:

- `SAT_gatewayUrl`
- `SAT_gatewayToken`

Operasi yang tersedia:

- `SPREADSHEET_APPEND`
- `DRIVE_UPLOAD`
- `PDF_CREATE`

### Tahap 5 — Migrasi menu SIM SATRIA
Setiap menu lama dimigrasikan satu per satu.

Pola setiap menu:

1. Tambahkan `kode_menu` ke `MASTER_MENU`.
2. Berikan permission melalui `grantMenuPermission()`.
3. Fungsi baca memakai school scope.
4. INPUT memakai `saveDataViaGateway()`.
5. UPLOAD memakai `uploadViaGateway()`.
6. PDF memakai `pdfViaGateway()`.
7. UI hanya menampilkan menu yang dimiliki role.

## Matriks target

| Role | Spreadsheet | Drive | Input | Upload | PDF |
|---|---|---|---|---|---|
| ADMIN_SEKOLAH | Editor | Editor | Ya | Ya | Ya |
| GURU | Viewer | Viewer | Ya | Ya | Ya |
| WALI_KELAS | Viewer | Viewer | Ya | Ya | Ya |
| KARYAWAN | Viewer | Viewer | Ya | Ya | Ya |
| SISWA | Viewer | Viewer | Ya | Ya | Ya |

**Catatan:** Viewer pada Google Spreadsheet/Drive tidak berarti dilarang melakukan INPUT/UPLOAD/PDF. Operasi aplikasi diperiksa melalui permission server dan write gateway.
