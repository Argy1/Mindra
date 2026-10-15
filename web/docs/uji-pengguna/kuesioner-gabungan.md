# Kuesioner gabungan SUS + UEQ-S (siap disalin ke Google Form)

Dipakai segera setelah responden menyelesaikan tugas (protokol: [`../UJI-PENGGUNA.md`](../UJI-PENGGUNA.md)). Waktu mengisi
sekitar 4 menit. Salin per bagian ke satu Google Form. Butir SUS dan UEQ-S di bawah **dijaga sama dengan kode** oleh tes
`lib/domain/usability/docs-sync.test.ts`: jangan mengubah katanya di sini, di formulir, atau di kode tanpa memeriksa sumbernya.

| Instrumen | Versi bahasa Indonesia | Sumber |
| --------- | ---------------------- | ------ |
| SUS (10 butir, skala 1-5) | Adaptasi Indonesia | Z. Sharfina dan H. B. Santoso, "An Indonesian adaptation of the System Usability Scale (SUS)", ICACSIS 2016. Teks butir disalin dari kutipan sekunder yang menyebut makalah itu; **bandingkan dengan makalah aslinya (IEEE Xplore) sebelum mencetak butir di proposal** |
| UEQ-S (8 pasang kata sifat, skala 7 titik) | Indonesian version resmi | <https://www.ueq-online.org/Material/UEQS_Items.pdf>, bagian "Indonesian version" (halaman 3), diperiksa 15 Okt 2026 |

## Pengaturan formulir

- Judul: **Penilaian Mindra (uji pengguna)**. Deskripsi: "Isi sesuai kesanmu saat mencoba tadi. Tidak ada jawaban benar atau
  salah. Jangan menulis nama atau data pribadi."
- **Jangan** mengumpulkan alamat email, **jangan** mewajibkan masuk akun Google, dan **matikan** "Acak urutan pertanyaan"
  (nomor butir dipakai pada berkas hasil; urutannya harus tetap).
- Semua pertanyaan wajib, kecuali tiga pertanyaan terbuka di bagian 5.
- Satu bagian (halaman) per instrumen, supaya responden tidak menggulir terlalu panjang di ponsel.

## Bagian 1: persetujuan

Teks (sama dengan yang dibacakan fasilitator): "Kami sedang menguji Mindra, aplikasi pendamping kesehatan mental, untuk lomba
UINIC 8.0. Kamu sudah mencoba beberapa tugas memakai akun demo; sekarang mengisi dua kuesioner singkat dan tiga pertanyaan.
Yang dinilai aplikasinya, bukan kamu. Kami tidak mencatat namamu, hanya nomor responden. Jangan memasukkan data pribadi atau
perasaanmu yang sebenarnya. Kamu boleh berhenti kapan saja. Hasil dipakai untuk memperbaiki aplikasi dan ditulis dalam
laporan lomba sebagai angka gabungan."

Pertanyaan (pilihan tunggal, wajib): "Apakah kamu bersedia ikut?" Pilihan: **Ya, saya bersedia** / **Tidak**. Atur
"Tidak" agar langsung menuju akhir formulir.

## Bagian 2: identitas anonim

| Pertanyaan | Jenis | Catatan |
| ---------- | ----- | ------- |
| ID responden | Jawaban singkat, validasi ekspresi reguler `R[0-9]{2,3}` | Diisi fasilitator (R01, R02, ...). Kolom `id` |
| Peran | Pilihan tunggal: `pengguna`, `profesional` (huruf kecil persis) | Kolom `peran` |

## Bagian 3: SUS (skala linear 1 sampai 5)

Petunjuk di atas bagian: "Pilih seberapa kamu setuju dengan setiap pernyataan tentang Mindra. 1 = Sangat tidak setuju,
2 = Tidak setuju, 3 = Ragu-ragu, 4 = Setuju, 5 = Sangat setuju."

Setiap pernyataan satu pertanyaan **Skala linear**, mulai dari **1** sampai **5**, label kiri **Sangat tidak setuju**,
label kanan **Sangat setuju**. Skala di Google Form hanya memberi label di ujung, jadi petunjuk di atas wajib ada.

| No | Pernyataan | Kolom CSV |
| -: | ---------- | --------- |
| 1 | Saya berpikir akan menggunakan sistem ini lagi | q1 |
| 2 | Saya merasa sistem ini rumit untuk digunakan | q2 |
| 3 | Saya merasa sistem ini mudah digunakan | q3 |
| 4 | Saya membutuhkan bantuan dari orang lain atau teknisi dalam menggunakan sistem ini | q4 |
| 5 | Saya merasa fitur-fitur sistem ini berjalan dengan semestinya | q5 |
| 6 | Saya merasa ada banyak hal yang tidak konsisten (tidak serasi pada sistem ini) | q6 |
| 7 | Saya merasa orang lain akan memahami cara menggunakan sistem ini dengan cepat | q7 |
| 8 | Saya merasa sistem ini membingungkan | q8 |
| 9 | Saya merasa tidak ada hambatan dalam menggunakan sistem ini | q9 |
| 10 | Saya perlu membiasakan diri terlebih dahulu sebelum menggunakan sistem ini | q10 |

Simpan jawaban **apa adanya (1 sampai 5)**. Jangan membalik butir bernomor genap di spreadsheet: alat rekap yang membaliknya.

## Bagian 4: UEQ-S (skala linear 1 sampai 7)

Petunjuk singkat di atas bagian (buatan tim untuk formulir ini, **bukan** terjemahan resmi petunjuk UEQ): "Berikut pasangan
kata yang saling berlawanan. Pilih titik yang paling dekat dengan kesanmu tentang Mindra. Jawab spontan, tidak ada jawaban
benar atau salah."

Setiap pasangan satu pertanyaan **Skala linear**, mulai dari **1** sampai **7**, **label kiri = kata di kolom kiri**,
**label kanan = kata di kolom kanan**. Judul pertanyaan boleh kosong atau berisi nomor butir. Kutub kiri selalu yang negatif
dan kutub kanan yang positif (sesuai berkas resmi), jadi 1 = paling kiri dan 7 = paling kanan.

| No | Kutub kiri (titik 1) | Kutub kanan (titik 7) | Kolom CSV |
| -: | -------------------- | --------------------- | --------- |
| 1 | menghalangi | mendukung | ueq1 |
| 2 | rumit | sederhana | ueq2 |
| 3 | tidak efisien | efisien | ueq3 |
| 4 | membingungkan | jelas | ueq4 |
| 5 | membosankan | mengasyikkan | ueq5 |
| 6 | tidak menarik | menarik | ueq6 |
| 7 | konvensional | berdaya cipta | ueq7 |
| 8 | lazim | terdepan | ueq8 |

Butir 1 sampai 4 membentuk **pragmatic quality**, butir 5 sampai 8 **hedonic quality**, dan kedelapannya **overall**. Simpan
jawaban **apa adanya (1 sampai 7)**. Jangan mengubahnya menjadi -3 sampai +3 sendiri: alat rekap yang mengubahnya (nilai - 4).

## Bagian 5: tiga pertanyaan terbuka (opsional, jawaban paragraf)

1. Apa yang paling kamu suka?
2. Apa yang paling membingungkan atau menyulitkan?
3. Apa satu hal yang akan kamu ubah?

Petunjuk: "Jangan menulis nama atau kontak." Kolom `buka1`, `buka2`, `buka3`.

## Dari Google Form ke berkas hasil

1. Di Form: **Tanggapan** > **Tautkan ke Sheets**, lalu di Sheets **File > Unduh > CSV**. Excel berlokal Indonesia menyimpan
   dengan titik koma; alat rekap mengenalinya otomatis.
2. Susun kolom menjadi satu baris judul persis seperti ini (salin utuh; templat kosongnya
   `docs/uji-pengguna/template-respons.csv`):

   ```
   id,peran,t1,t2,t3,t4,t5,t6,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,ueq1,ueq2,ueq3,ueq4,ueq5,ueq6,ueq7,ueq8,buka1,buka2,buka3
   ```

3. Isi `t1` sampai `t6` dari **lembar pengamat** (tidak ada di Form): `1` selesai tanpa bantuan, `0` tidak selesai atau
   dibantu, kosong tidak dikerjakan. Cocokkan lewat `id`.
4. Buang kolom Timestamp. Simpan sebagai `docs/uji-pengguna/respons.csv` (tidak di-commit, sudah di `.gitignore`).
5. Jalankan `pnpm usability:report docs/uji-pengguna/respons.csv --out docs/uji-pengguna/hasil.md`.

Baris UEQ-S boleh dikosongkan seluruhnya bila responden tidak mengisinya; terisi sebagian **ditolak** dengan alasan. Baris
yang cacat tidak ikut dihitung dan dilaporkan di bagian "Baris yang ditolak".

## Jumlah responden

Target **minimal 30** (pengguna dan profesional digabung untuk SUS dan UEQ-S). Patokan umum yang dipakai: SUS sudah stabil
pada sekitar 12 sampai 14 responden, sedangkan UEQ memerlukan sekitar 20 sampai 30; periksa sumber patokan ini sebelum
dikutip di proposal. Di bawah 20 responden UEQ-S, laporan menandai kategori benchmark sebagai indikatif.
