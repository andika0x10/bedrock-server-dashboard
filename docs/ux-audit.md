# Audit pengalaman pengguna

Tujuan: membantu pemilik server Bedrock menyiapkan permainan, mengelola world dan addon, serta memahami kondisi server tanpa menghafal konfigurasi.

## Temuan dari kode awal

| Prioritas | Masalah                                                       | Perbaikan dalam perubahan ini                                                                                     |
| --------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tinggi    | Ringkasan hanya berisi link modul; kondisi server tersembunyi | Status, sumber daya host, world aktif, pemain online, log, kontrol dan alamat koneksi di ringkasan                |
| Tinggi    | Tidak ada alur menyiapkan world baru                          | Form penyiapan nama server, world, seed, mode, kesulitan dan kapasitas; world dibuat oleh Bedrock saat dinyalakan |
| Tinggi    | Tidak ada ekspor world untuk cadangan manual                  | Unduh .mcworld saat server berhenti, termasuk pack kustom yang dirujuk world                                      |
| Tinggi    | Perubahan world/addon saat server hidup tidak jelas           | Perubahan world dan addon ditolak saat server hidup; petunjuk ditampilkan di halaman                              |
| Tinggi    | Nama world masuk ke path dan konten upload masuk innerHTML    | Validasi nama/path, validasi nilai konfigurasi, escape teks dinamis                                               |
| Sedang    | Mode dan kesulitan berupa input teks tanpa panduan            | Pilihan terstruktur, batas angka, penjelasan, kelompok pengaturan dan pemberitahuan restart                       |
| Sedang    | Navigasi, hirarki dan warna seragam                           | Sidebar, judul dan deskripsi setiap halaman, desain terang, fokus keyboard dan tata letak seluler                 |
| Sedang    | Addon tidak menjelaskan target world                          | World target ditampilkan dan tindakan memakai kata aktifkan/nonaktifkan                                           |
| Sedang    | Tidak ada petunjuk koneksi                                    | Salin host dashboard + port game; jelaskan domain/IP game dapat berbeda                                           |

## Pekerjaan lanjutan

- Installer/update binary Bedrock: unduhan resmi, validasi versi, persetujuan lisensi, backup dan rollback. Saat ini binary harus sudah terpasang di host.
- Banyak server: direktori, port, proses, sumber daya dan hak akses terpisah. Saat ini aplikasi mengelola satu instance.
- Backup terjadwal, retensi, restore dan penyimpanan di luar host. Ekspor manual saat server berhenti belum menggantikan fitur ini.
- Manajemen allowlist dan izin pemain melalui form; riwayat pemain saat ini bersumber dari log.
- Validasi dependensi, versi minimum game, urutan pack, pembaruan addon dan impor .mcaddon dengan arsip .mcpack bertingkat.
- Monitoring yang persisten, notifikasi kegagalan dan jadwal restart. Metrik saat ini adalah penggunaan seluruh host.
- Ketahanan operasi: serialisasi mutasi/proses, transaksi impor addon, pembatasan ukuran/dekompresi arsip, audit log, pembatasan percobaan login dan sesi persisten.
- Deteksi proses eksternal saat ini bergantung pada port bawaan; pemulihan kontrol proses eksternal perlu dirancang ulang agar tidak memicu restart tak terduga.

## Arah desain

Palet: canvas #F5F6FA, permukaan #FFFFFF, teks #242638, ungu #7154C7, hijau #34785B, garis #E5E6EF.
Tipografi: Plus Jakarta Sans untuk UI, bobot 400–800; angka memakai tabular numerals.
Layout: sidebar kiri + header konteks + area kerja rata kiri. Ringkasan diawali world aktif, diikuti metrik dan area aktivitas. Di layar kecil sidebar menjadi navigasi horizontal.

```
[ Navigasi ] [ Konteks halaman                        ]
[          ] [ World aktif / kontrol ] [ Koneksi       ]
[          ] [ CPU          RAM          Disk   Pemain ]
[          ] [ World & addon         ] [ Log terbaru   ]
```

Review arah: hindari kartu pintasan identik dan hitam/hijau generik. Ilustrasi blok hanya dipakai pada area world agar karakter Minecraft terasa tanpa mengurangi keterbacaan tabel dan formulir.

## Validasi dan cara mencoba

- `npx astro check`: tidak ada error. Ada tiga hint variabel yang tidak dipakai pada addon Bedrock yang sudah ada di host.
- `npm run test:integration`: 12 pengujian API terhadap build aplikasi. Build, konfigurasi, world, addon dan proses Bedrock tiruan dibuat di direktori sementara. Proses game asli tidak disentuh.
- Pemeriksaan Chromium: login; tujuh halaman dashboard pada lebar 1440, 390 dan 320 piksel; penyiapan world; simpan pengaturan; impor/aktivasi addon; nama addon berisi HTML tampil sebagai teks; unduhan world; start, perintah konsol, stop; dan penolakan pergantian world saat aktif. Tidak ada error JavaScript atau overflow halaman.
- Pengujian otomatis memakai proses game tiruan. Generasi world oleh binary Minecraft dan impor arsip hasil ekspor ke klien Minecraft belum diuji langsung.

Untuk mencoba kode terbaru: jalankan `npm run dev -- --host 0.0.0.0 --port 4323`, lalu masuk menggunakan akun administrator pada `.env`. Versi ini sudah di-build dan dashboard direstart melalui PM2. Untuk pembaruan berikutnya, ikuti prosedur build/restart dalam README setelah game dihentikan secara normal.

Pratinjau desktop dan seluler memakai data uji: [desktop](../images/dashboard-desktop.png), [seluler](../images/dashboard-mobile.png).
