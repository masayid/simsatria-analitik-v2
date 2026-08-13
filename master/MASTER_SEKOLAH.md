# MASTER_SEKOLAH

Registry sekolah pada sistem multi-school.

| Kolom | Keterangan |
|---|---|
| id_sekolah | ID unik sekolah internal |
| npsn | NPSN sekolah |
| nama_sekolah | Nama sekolah |
| spreadsheet_id | Spreadsheet operasional sekolah |
| drive_folder_id | Folder Drive utama sekolah |
| status | ACTIVE / INACTIVE |

## Prinsip
Satu `id_sekolah` hanya boleh menunjuk satu konteks sekolah. Semua akses user dibatasi oleh `id_sekolah`.
