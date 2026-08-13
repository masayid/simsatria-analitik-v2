# MASTER_USER

Identitas pengguna aplikasi.

| Kolom | Keterangan |
|---|---|
| id_user | ID unik user |
| id_sekolah | Relasi ke MASTER_SEKOLAH |
| nama | Nama pengguna |
| email | Akun Google yang digunakan login |
| role | ADMIN_SEKOLAH / GURU / WALI_KELAS / KARYAWAN / SISWA |
| status | ACTIVE / INACTIVE |

Email digunakan untuk identifikasi `Session.getActiveUser()`; user tidak boleh mengakses sekolah lain di luar `id_sekolah` miliknya.
