# MASTER_MENU

Registry menu aplikasi.

| Kolom | Keterangan |
|---|---|
| kode_menu | Kode unik modul |
| nama_menu | Label menu |
| parent_id | Parent menu bila ada |
| urutan | Urutan tampilan |
| icon | Icon/identifier UI |
| aktif | TRUE/FALSE |

Menu baru harus didaftarkan terlebih dahulu dengan `addMenu()`, kemudian permission role diberikan melalui `grantMenuPermission()`.
