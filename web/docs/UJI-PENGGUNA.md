# Uji pengguna Mindra Web: protokol dan alat

Dokumen kerja untuk **uji pengguna 24–26 Okt 2026** (docs/PLAN.md, Fase 5). Yang sudah disiapkan di repo: protokol, lembar
persetujuan, tugas, kuesioner SUS, format pencatatan, dan alat rekap otomatis. Yang **belum ada dan tidak bisa dibuat
oleh perangkat lunak**: responden dan hasilnya. Angka SUS di proposal hanya boleh berasal dari sesi nyata di bawah ini.

## 1. Tujuan dan pertanyaan

1. Apakah pengguna baru bisa menyelesaikan tugas inti (skrining, jurnal, privasi, memesan psikolog) tanpa bantuan?
2. Seberapa mudah dipakai menurut pengguna (skor SUS)? Apakah di atas patokan 68?
3. Apa tiga masalah kegunaan yang paling sering dan paling berat? Perbaiki ketiganya sebelum 29 Okt.
4. Apakah psikolog atau konselor memahami portal klien dan peringatan krisis tanpa penjelasan?

## 2. Peserta

| Kelompok     | Jumlah     | Siapa                                           | Peran di berkas |
| ------------ | ---------- | ----------------------------------------------- | --------------- |
| Pengguna     | 20–28      | Mahasiswa, usia 18 tahun ke atas                | `pengguna`      |
| Profesional  | 1–2 (bila bisa) | Psikolog atau konselor kampus              | `profesional`   |

- **Total 20–30.** Sampel kemudahan (teman kampus, kelas, organisasi). Itu keterbatasan yang wajib ditulis di proposal:
  hasilnya menggambarkan kelompok ini, bukan seluruh pengguna.
- Jangan mengundang orang yang sedang dalam perawatan kesehatan jiwa atau krisis. Uji ini menilai **tampilan dan alur**,
  bukan kondisi mereka.
- Jangan memberi imbalan yang bergantung pada nilai bagus. Jangan menggiring jawaban.
- Pengguna di bawah 18 tahun tidak diikutkan (butuh persetujuan wali dan tinjauan etik yang tidak tersedia).

## 3. Etika, persetujuan, dan keselamatan

Prinsip: **tidak ada data sungguhan yang dimasukkan, tidak ada nama yang dicatat, dan siapa pun boleh berhenti kapan saja.**

- Semua tugas memakai **akun demo** dan data demo. Responden dilarang mengisi perasaan atau data pribadinya sendiri.
  Katakan di awal: "Isi seolah-olah kamu orang lain. Jawaban skrining boleh asal, kami menilai aplikasinya, bukan kamu."
- Responden hanya diberi id anonim (R01, R02, …). Daftar id ↔ orang **tidak** dicatat. Berkas hasil tidak memuat nama,
  email, atau kontak.
- Bila responden tampak tertekan oleh isi skrining atau percakapan: **hentikan sesi**, tanyakan kabarnya dengan tenang,
  dan tawarkan kontak bantuan yang tampil di aplikasi (SEJIWA 119 ext. 8; sumber tunggalnya
  `lib/domain/crisis/resources.ts`, verifikasi nomornya sebelum hari pertama). Catat di lembar pengamat "sesi dihentikan",
  tanpa rincian.
- Teman cerita memanggil layanan AI pihak ketiga (Anthropic). Pada akun demo, minta responden **tidak** menulis hal
  pribadi, dan pastikan `ANTHROPIC_API_KEY` di lingkungan demo memang sengaja diaktifkan.
- Simpan berkas respons hanya di perangkat tim. Jangan memasukkannya ke repositori publik.

### Teks persetujuan (dibacakan atau dicetak, jawab lisan "ya")

> Kami sedang menguji Mindra, aplikasi pendamping kesehatan mental, untuk lomba UINIC 8.0. Sesi ini sekitar 20 menit:
> kamu mencoba beberapa tugas di aplikasi memakai akun demo, lalu mengisi kuesioner 10 pernyataan dan tiga pertanyaan
> singkat. Yang dinilai aplikasinya, bukan kamu. Kami tidak mencatat namamu, hanya nomor responden. Jangan memasukkan
> data pribadi atau perasaanmu yang sebenarnya ke aplikasi. Kamu boleh berhenti kapan saja tanpa alasan. Hasil dipakai
> untuk memperbaiki aplikasi dan ditulis dalam laporan lomba sebagai angka gabungan. Apakah kamu bersedia ikut?

## 4. Persiapan

- **Alamat demo** (tanpa itu uji tidak bisa dimulai): URL Vercel yang sudah berjalan, `NEXT_PUBLIC_SITE_URL` benar.
- **Akun demo** untuk setiap peran. Buat dengan `pnpm seed` (lihat README bagian "Akun demo"). Tiap responden memakai akun
  pengguna demo yang sama; **setel ulang** data demo antar-responden bila tugas mengubah data (mis. izin yang dicabut).
- **Perangkat:** separuh responden di laptop (layar ≥ 1280 px), separuh di ponsel (≈ 390 px). Catat perangkatnya
  di kolom catatan lembar pengamat.
- **Tim:** satu fasilitator yang bicara, satu pencatat yang diam. Pencatat mengisi lembar pengamat (bagian 8).
- **Waktu:** 20–25 menit per sesi. 24–26 Okt, kira-kira 8–10 sesi per hari. Sisakan 27 Okt untuk rekap dan 28 Okt untuk
  perbaikan tiga masalah teratas.
- Uji coba dulu dengan 2 teman (tidak dihitung) untuk memastikan tugas dan akun demo berjalan.

## 5. Skrip fasilitator

1. **Sambutan (2 menit).** Jelaskan tujuan, bacakan persetujuan, tegaskan boleh berhenti kapan saja.
2. **Aturan "berpikir keras".** "Ucapkan apa yang kamu pikirkan saat mencoba. Kalau bingung, bilang saja. Aku tidak akan
   membantu kecuali kamu minta, dan itu tidak apa-apa."
3. **Tugas (12–15 menit).** Bacakan satu tugas, lalu diam. Beri bantuan hanya bila responden buntu **lebih dari 2 menit**
   atau meminta; catat tugasnya sebagai "dibantu" (0).
4. **Kuesioner (3 menit).** Berikan SUS (bagian 7) segera setelah tugas, sebelum diskusi, supaya penilaiannya spontan.
5. **Tiga pertanyaan terbuka (3 menit).**
6. **Penutup.** Terima kasih, jelaskan data tidak memuat nama. Jangan membahas "jawaban yang benar" sebelum semua
   responden selesai.

## 6. Tugas

Kolom `t1` sampai `t6` pada berkas hasil: **1** = selesai tanpa bantuan, **0** = tidak selesai atau dibantu,
**kosong** = tidak dikerjakan. Tugas berbeda untuk tiap peran (laporan menghitungnya per peran).

### Pengguna (`peran = pengguna`)

| Kode | Tugas (dibacakan)                                                                              | Selesai bila                                                              |
| ---- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| t1   | "Masuk ke Mindra memakai akun demo ini."                                                       | Halaman Beranda terbuka                                                   |
| t2   | "Isi skrining PHQ-9 sampai kamu melihat hasilnya."                                             | Halaman hasil terbuka; responden bisa menyebut bahwa ini skrining, bukan diagnosis |
| t3   | "Catat mood kamu hari ini, lalu catat tidur semalam."                                          | Satu catatan mood dan satu catatan tidur tersimpan                        |
| t4   | "Cari tahu siapa saja yang pernah membuka datamu, lalu matikan satu izin berbagi."             | Halaman Privasi dibuka, riwayat akses terlihat, satu izin dimatikan       |
| t5   | "Pesan satu sesi dengan psikolog untuk minggu depan."                                          | Layar konfirmasi pemesanan tampil (boleh dibatalkan setelahnya)           |
| t6   | "Ceritakan satu hal singkat ke Teman cerita." (hanya bila AI aktif; **jangan hal pribadi**)    | Satu balasan diterima                                                     |

### Profesional (`peran = profesional`)

| Kode | Tugas (dibacakan)                                                         | Selesai bila                                        |
| ---- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| t1   | "Masuk ke portal psikolog dengan akun demo ini."                          | Dasbor terbuka (verifikasi dua langkah dimatikan untuk demo, lihat README) |
| t2   | "Buka detail salah satu klien dan cari tren mood minggu ini."             | Detail klien terbuka, responden menunjuk grafik mood |
| t3   | "Cari tahu bila ada klien yang membutuhkan perhatian segera."             | Responden menemukan panel peringatan krisis         |

## 7. Kuesioner

### System Usability Scale (SUS)

Skala 1 sampai 5: 1 = sangat tidak setuju, 2 = tidak setuju, 3 = netral, 4 = setuju, 5 = sangat setuju.
Sumber butir: `lib/domain/usability/sus.ts` (`SUS_ITEMS`); teksnya sama dengan di bawah, terjemahan bebas dari Brooke (1996).

| No | Pernyataan                                                                                              |
| -: | ------------------------------------------------------------------------------------------------------- |
|  1 | Saya rasa saya akan sering menggunakan sistem ini.                                                      |
|  2 | Saya merasa sistem ini terlalu rumit, padahal sebenarnya bisa dibuat lebih sederhana.                   |
|  3 | Saya merasa sistem ini mudah digunakan.                                                                 |
|  4 | Saya rasa saya akan membutuhkan bantuan orang yang paham teknis untuk dapat menggunakan sistem ini.     |
|  5 | Saya merasa fungsi-fungsi dalam sistem ini terpadu dengan baik.                                         |
|  6 | Saya merasa ada terlalu banyak hal yang tidak konsisten dalam sistem ini.                               |
|  7 | Saya membayangkan kebanyakan orang akan cepat belajar menggunakan sistem ini.                           |
|  8 | Saya merasa sistem ini sangat merepotkan untuk digunakan.                                               |
|  9 | Saya merasa sangat percaya diri saat menggunakan sistem ini.                                            |
| 10 | Saya perlu belajar banyak hal sebelum bisa menggunakan sistem ini dengan baik.                          |

**Skor** (otomatis oleh `pnpm usability:report`): butir ganjil = jawaban − 1; butir genap = 5 − jawaban; jumlahkan,
kali 2,5. Hasil 0 sampai 100 (**bukan persen**). Patokan: 68 = rata-rata banyak studi (Sauro, 2011); di bawah 50
tidak dapat diterima, 50–70 marginal, di atas 70 dapat diterima (Bangor, Kortum, dan Miller, 2008). Periksa kutipan
ini langsung ke sumbernya sebelum masuk daftar pustaka proposal.

### Tiga pertanyaan terbuka

1. Apa yang paling kamu suka?
2. Apa yang paling membingungkan atau menyulitkan?
3. Apa satu hal yang akan kamu ubah?

## 8. Pencatatan

Satu berkas CSV, satu baris per responden. Salin `docs/uji-pengguna/template-respons.csv` ke
`docs/uji-pengguna/respons.csv` (berkas itu **tidak** di-commit; lihat `.gitignore`).

| Kolom           | Isi                                                                  |
| --------------- | -------------------------------------------------------------------- |
| `id`            | R01, R02, … (anonim, unik)                                           |
| `peran`         | `pengguna` atau `profesional`                                        |
| `t1`…`t6`       | 1 / 0 / kosong, lihat bagian 6                                       |
| `q1`…`q10`      | Jawaban SUS 1–5                                                      |
| `buka1`…`buka3` | Jawaban terbuka, ringkas, tanpa nama                                 |

Excel berlokal Indonesia menyimpan CSV dengan titik koma; alat rekap mengenalinya otomatis. Baris yang cacat (jawaban di
luar 1–5, id dobel, kolom kosong) **ditolak dengan alasan**, bukan diperbaiki diam-diam.

Lembar pengamat (kertas atau catatan terpisah), per responden: perangkat (laptop/ponsel), tugas yang dibantu beserta
alasannya, hal yang membuat bingung (kutipan singkat), sesi dihentikan atau tidak.

## 9. Rekap dan perbaikan

```bash
pnpm usability:report docs/uji-pengguna/respons.csv --out docs/uji-pengguna/hasil.md
```

Laporan memuat: rata-rata, median, simpangan baku, selang kepercayaan 95%, jumlah responden di atas 68, sebaran kategori
penerimaan, penyelesaian tiap tugas per peran, **butir SUS yang paling menurunkan skor**, dan jawaban terbuka per
pertanyaan.

Menentukan tiga masalah teratas:

1. Dari lembar pengamat dan jawaban terbuka, daftar semua masalah dan hitung berapa responden mengalaminya (frekuensi).
2. Beri tingkat keparahan 0–4 (0 bukan masalah, 1 kosmetik, 2 kecil, 3 besar, 4 membuat tugas gagal).
3. Urutkan frekuensi × keparahan. Ambil tiga teratas, perbaiki, dan catat tiap perbaikan di `docs/DECISIONS.md`
   (masalah → bukti → perubahan).
4. Jangan menjalankan uji ulang lalu hanya melaporkan angka yang bagus. Bila sempat uji ulang, laporkan **kedua** hasilnya.

## 10. Yang boleh dan tidak boleh ditulis di proposal

- Tulis: jumlah responden, cara perekrutan (sampel kemudahan), skor rata-rata dengan selang kepercayaan, jumlah di atas
  68, penyelesaian tugas, tiga masalah teratas dan perbaikannya, keterbatasan.
- Jangan tulis: "pengguna menyukai", "terbukti efektif", atau klaim manfaat klinis. SUS mengukur kesan kemudahan pakai.
- Jangan membulatkan atau memilih hanya responden yang bagus. Tolak data hanya dengan alasan tertulis (baris cacat).

## 11. Daftar periksa

- [ ] URL demo hidup dan akun demo tiap peran berfungsi
- [ ] Nomor krisis diverifikasi (`lib/domain/crisis/resources.ts`)
- [ ] Persetujuan dicetak atau siap dibacakan
- [ ] Dua sesi uji coba selesai
- [ ] Berkas `respons.csv` dibuat dari templat dan **tidak** akan di-commit
- [ ] Setelah 26 Okt: jalankan `pnpm usability:report`, tentukan tiga masalah teratas, perbaiki, catat di DECISIONS
