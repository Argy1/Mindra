# Kebijakan Privasi Mindra

**Berlaku efektif:** 14 Oktober 2026
**Versi:** 1.1.0

Mindra ("kami", "aplikasi") adalah aplikasi mobile dan situs web kesehatan mental digital yang memakai satu akun
dan satu basis data. Kebijakan
Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, melindungi,
dan membagikan data pribadi Anda. Privasi Anda — terutama data kesehatan mental
yang sangat sensitif — adalah prioritas utama kami.

Dengan menggunakan Mindra, Anda menyetujui praktik yang dijelaskan dalam
kebijakan ini. Kami berkomitmen mematuhi **Undang-Undang No. 27 Tahun 2022
tentang Pelindungan Data Pribadi (UU PDP)**.

---

## 1. Data yang Kami Kumpulkan

### 1.1 Data yang Anda berikan
- **Data akun:** nama, alamat email, kata sandi (disimpan dalam bentuk ter-hash).
- **Data profil:** tanggal lahir, jenis kelamin, kota dan provinsi domisili (opsional).
- **Versi naskah yang Anda setujui** saat mendaftar, beserta waktunya.
- **Data kesehatan mental:**
  - Hasil asesmen (PHQ-9, GAD-7, PSS-10, SRQ-20) — jawaban dan skor.
  - Catatan suasana hati, tingkat energi, dan pemicu.
  - Catatan tidur.
  - Refleksi malam dan jurnal.
  - Rekaman jurnal suara.
  - Percakapan dengan AI companion.
  - Catatan latihan CBT.
- **Data kontak darurat & pendamping** yang Anda tambahkan.

### 1.2 Data yang terkumpul otomatis
- Informasi perangkat dasar dan jenis sistem operasi.
- Log notifikasi yang dikirim ke perangkat Anda.
- Waktu penggunaan aplikasi (untuk menjadwalkan pengingat secara adaptif).

Mindra **tidak** mengumpulkan lokasi presisi Anda kecuali Anda secara aktif
menggunakan fitur peta fasilitas kesehatan.

---

## 2. Bagaimana Kami Menggunakan Data Anda

Kami menggunakan data Anda semata-mata untuk:
- Menyediakan dan mempersonalisasi fitur aplikasi (asesmen, pelacakan,
  wawasan mingguan, rekomendasi).
- Mendeteksi tanda-tanda krisis dan menampilkan sumber bantuan tepat waktu.
- Menjadwalkan pengingat yang relevan dan suportif.
- Memfasilitasi telekonsultasi dengan psikolog yang Anda pilih.
- Menjaga keamanan akun dan mencegah penyalahgunaan.

Kami **tidak** menjual data pribadi Anda. Kami **tidak** menggunakan data
kesehatan mental Anda untuk iklan.

---

## 3. Dasar Hukum Pemrosesan

Kami memproses data Anda berdasarkan **persetujuan** Anda yang dapat ditarik
sewaktu-waktu, serta untuk memenuhi layanan yang Anda minta. Data kesehatan
mental diperlakukan sebagai data pribadi yang bersifat spesifik dan diberi
perlindungan lebih tinggi sesuai UU PDP.

---

## 4. Pembagian Data

Data Anda hanya dibagikan dalam keadaan berikut, dan selalu di bawah kendali
Anda:

### 4.1 SATUSEHAT (Kementerian Kesehatan RI)
- Sinkronisasi ke SATUSEHAT bersifat **opt-in** dan memerlukan **persetujuan
  eksplisit** Anda setiap kali, atau melalui pengaturan sinkronisasi otomatis
  yang Anda aktifkan sendiri.
- Hanya **jenis instrumen, skor total, kategori keparahan, dan waktu
  penyelesaian asesmen** beserta identitas dasar yang dikirim.
- **Tidak pernah dibagikan:** jawaban per pertanyaan, percakapan AI, jurnal
  suara, refleksi malam, dan catatan suasana hati.
- Anda dapat mencabut persetujuan kapan saja melalui **Profil → SATUSEHAT**.

### 4.2 Psikolog
- Psikolog hanya melihat bagian yang **Anda izinkan** (hasil asesmen, suasana hati,
  tidur, peringatan krisis, ringkasan teman cerita) setelah Anda menghubungkannya, dan
  setiap kali datanya dibuka tercatat di riwayat akses yang dapat Anda baca. Memesan
  konsultasi saja tidak membuka identitas atau catatan Anda. Akun psikolog wajib
  memakai verifikasi dua langkah.

### 4.3 Pendamping (Caregiver)
- Jika Anda mengundang seorang pendamping, mereka hanya melihat data yang
  **Anda izinkan secara spesifik** (mis. suasana hati harian atau ringkasan
  asesmen). Catatan pribadi, rekaman suara, dan jurnal tidak pernah dibagikan.
- Anda dapat mencabut akses pendamping kapan saja.

### 4.4 Penyedia layanan
- Kami menggunakan Supabase sebagai penyedia basis data dan autentikasi. Data
  disimpan terenkripsi saat transit dan saat istirahat.
- Percakapan dengan AI companion diproses oleh penyedia model (Anthropic). Yang
  dikirim hanya isi percakapan, tanpa nama, email, atau pengenal akun Anda. Pesan
  yang terdeteksi memuat tanda krisis dijawab dengan balasan tetap dari Mindra dan
  tidak dikirim ke model.
- Situs web memakai Vercel (hosting) dan Upstash (pembatasan laju permintaan; hanya
  penghitung sementara, bukan isi data kesehatan).

### 4.5 Statistik wilayah anonim (pilihan Anda)
- Jika Anda menyalakan **Ikut statistik wilayah anonim** (mati secara bawaan), kota
  dan provinsi Anda dipakai untuk menempatkan hasil dan aktivitas Anda ke dalam
  angka gabungan bagi puskesmas, dinas, dan mitra di provinsi Anda. Tanpa nama,
  dan hanya ditampilkan untuk kelompok minimal 10 orang.
- Anda dapat mematikannya kapan saja di **Profil > Edit Profil**; data Anda
  langsung tidak dihitung lagi pada permintaan angka berikutnya.

### 4.6 Admin Mindra
- Admin hanya membuka yang diperlukan untuk meninjau akun psikolog (nama, email,
  dan data praktik pemohon). Admin tidak membuka catatan kesehatan siapa pun, dan
  setiap keputusannya tercatat.

### 4.7 Kewajiban hukum
- Kami dapat mengungkapkan data jika diwajibkan oleh hukum yang berlaku.

---

## 5. Keamanan Data

- Seluruh komunikasi jaringan dienkripsi melalui HTTPS/TLS.
- **Rekaman jurnal suara dienkripsi dengan AES-256 di perangkat Anda** sebelum
  diunggah; kunci enkripsi unik per pengguna disimpan di penyimpanan aman
  sistem operasi (keystore) dan tidak pernah meninggalkan perangkat.
- *Row-Level Security* pada basis data memastikan Anda hanya dapat mengakses
  data Anda sendiri.
- Kata sandi tidak pernah disimpan dalam bentuk teks biasa.

Meski kami menerapkan langkah pengamanan yang kuat, tidak ada sistem yang
sepenuhnya kebal. Gunakan kata sandi yang kuat dan jaga kerahasiaan akun Anda.

---

## 6. Penyimpanan dan Retensi Data

- Data Anda disimpan selama akun Anda aktif.
- Saat Anda menghapus akun (**Profil > Hapus Akun**, memerlukan kata sandi Anda
  lagi), seluruh data Anda dihapus seketika dari basis data kami. Salinan cadangan
  yang dikelola penyedia basis data dapat tersimpan sampai siklus cadangannya
  berakhir, dan data yang diwajibkan disimpan oleh hukum dikecualikan.
- Data yang telah dikirim ke SATUSEHAT tunduk pada kebijakan retensi rekam
  medis nasional dan berada di luar kendali penghapusan kami.

---

## 7. Hak Anda

Sesuai UU PDP, Anda berhak untuk:
- **Mengakses** data pribadi Anda.
- **Memperbaiki** data yang tidak akurat melalui menu profil.
- **Menghapus** akun dan data Anda (Profil > Hapus Akun).
- **Menarik persetujuan** pemrosesan, termasuk sinkronisasi SATUSEHAT.
- **Membatasi atau menolak** pemrosesan tertentu.
- **Memperoleh salinan** data Anda (laporan PDF di aplikasi, atau berkas JSON
  lengkap lewat **Profil > Unduh data saya** di situs web).
- **Mengajukan keluhan** kepada lembaga pengawas yang berwenang.

Untuk menggunakan hak ini, hubungi kami melalui kanal pada Bagian 10.

---

## 8. Privasi Anak

Mindra ditujukan untuk pengguna berusia **17 tahun ke atas**; saat mendaftar Anda
diminta menyatakannya. Kami tidak
dengan sengaja mengumpulkan data dari anak di bawah usia tersebut tanpa
persetujuan orang tua atau wali. Jika Anda yakin seorang anak telah memberikan
data kepada kami, segera hubungi kami agar data tersebut dapat dihapus.

---

## 9. Perubahan Kebijakan

Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan
material akan diberitahukan melalui aplikasi. Tanggal "Berlaku efektif" di atas
menunjukkan versi terkini.

---

## 10. Hubungi Kami

Untuk pertanyaan, permintaan terkait data pribadi, atau keluhan privasi:

- **Email:** privasi@mindra.app
- **Alamat:** (alamat resmi penyelenggara Mindra)

Kami akan menanggapi permintaan Anda dalam jangka waktu yang wajar sesuai
ketentuan UU PDP.

---

> **Catatan penting:** Mindra adalah alat dukungan kesejahteraan, **bukan
> layanan medis darurat**. Jika Anda berada dalam krisis, lihat
> *Ketentuan Layanan* dan fitur **Bantuan** di dalam aplikasi untuk nomor
> darurat yang tersedia 24 jam.
