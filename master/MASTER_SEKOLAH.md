# MASTER_SEKOLAH
Registry sekolah multi-tenant.

| Kolom | Fungsi |
|---|---|
| id_sekolah | PK internal |
| npsn | Identitas sekolah |
| nama_sekolah | Nama sekolah |
| spreadsheet_id | Spreadsheet operasional sekolah |
| drive_folder_id | Folder Drive sekolah |
| status | ACTIVE/INACTIVE |

**Keterangan:** satu user selalu bekerja dalam scope `id_sekolah`.
