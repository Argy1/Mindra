# Mindra Web — Desain

Desain web adalah turunan dari design system mobile Mindra (`../colors_and_type.css`,
`../README.md` bagian Visual Foundations). Mockup HTML statis ada di `design/`. Buka
`design/index.html` di browser untuk melihat semuanya.

## Aturan pakai mockup

- Mockup adalah **acuan visual**, bukan kode produksi. Implementasikan ulang sebagai komponen
  React + Tailwind; jangan menyalin HTML mentah.
- `design/tokens.css` = token resmi (warna, tipe, spasi, radius, bayangan, motion) + tambahan web
  di bagian bawah. Petakan ke tema Tailwind v4 (`@theme`) di `app/globals.css`.
- `design/ui.css` = spesifikasi komponen dasar. Nama kelas ↔ komponen React:
  `.btn` → `<Button variant size>`, `.card` → `<Card>`, `.chip` → `<Chip>`, `.badge--{kategori}` →
  `<CategoryBadge>`, `.switch` → `<Switch>`, `.alert--crisis` → `<CrisisBanner>`,
  `.segmented` → `<SegmentedControl>`, `.shell/.sidebar/.bottom-nav` → `<AppShell>`.
- Kotak bergaris putus-putus biru (`.mock-note`) adalah catatan untuk developer. Jangan dirender.
- Ikon di mockup memakai Phosphor web font; di Next.js pakai `@phosphor-icons/react`
  (nama sama, mis. `ph-lifebuoy` → `<Lifebuoy />`, `ph-duotone` → `weight="duotone"`).
- Aset (`design/assets/`) disalin ke `public/` (logo + 7 glyph mood + ilustrasi).

## Prinsip

1. **Hangat, bukan klinis.** Kanvas krem `--neutral-50`, kartu putih, tidak ada putih polos sebagai latar.
2. **Satu momen berani per halaman.** Landing: diagram ekosistem "kerikil". Beranda: sapaan serif +
   kerikil mood. Hasil asesmen: angka skor besar. Selebihnya tenang.
3. **Serif untuk momen manusiawi** (sapaan, pertanyaan, skor, judul), **sans untuk kerja** (UI, data, tombol).
4. **Merah hanya untuk krisis/error.** Tidak pernah dekoratif. Kategori skor memakai success/info/warning/danger.
5. **Kendali ada di pengguna.** Setiap layar yang menampilkan data orang lain menyebut bahwa aksesnya tercatat.

## Skala tipe web

| Token       | Ukuran           | Font                 | Pakai di                                        |
| ----------- | ---------------- | -------------------- | ----------------------------------------------- |
| `display-1` | clamp(44–76px)   | Instrument Serif 400 | Hero landing                                    |
| `display-2` | clamp(34–52px)   | Instrument Serif 400 | Judul section landing                           |
| `display-3` | clamp(28–36px)   | Instrument Serif 400 | Sapaan dashboard, judul halaman, kategori hasil |
| `h1`        | 28 / 700         | Plus Jakarta Sans    | Judul di dalam app jika bukan momen serif       |
| `h2`        | 20 / 600         | Plus Jakarta Sans    | Judul kartu besar                               |
| `h3`        | 17 / 600         | Plus Jakarta Sans    | Judul kartu                                     |
| body        | 16 / 400, lh 1.6 | Plus Jakarta Sans    | Teks utama                                      |
| body-m      | 14               | Plus Jakarta Sans    | Teks sekunder                                   |
| meta        | 13               | Plus Jakarta Sans    | Waktu, keterangan                               |

Angka data memakai `font-variant-numeric: tabular-nums`. Tidak ada label ALL CAPS.

## Layout

- **AppShell:** sidebar 256px (desktop ≥ 961px) dengan logo, navigasi, tombol "Butuh bantuan
  sekarang" (selalu terlihat), dan profil. Di ≤ 960px sidebar diganti bottom nav 5 item.
- **Topbar** sticky 72px, latar blur di atas krem.
- **Lebar konten:** dashboard maks 1120px, asesmen/chat/artikel maks 720px.
- **Grid:** 2 kolom (1.7fr / 1fr) untuk dashboard; 1 kolom di ≤ 1100px.

## Halaman & mockup

| Rute                  | Mockup                     | Catatan                                                                                                                                               |
| --------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | `landing.html`             | Diagram ekosistem animasi sekali saat load (benang tergambar + satu titik berjalan), mati jika reduced motion                                         |
| `/beranda`            | `app-beranda.html`         | Check-in mood 7 kerikil (strip geser di mobile), insight mingguan mood + tidur, skrining terakhir, orang yang menemani, sesi berikutnya               |
| `/asesmen/[tipe]`     | `app-asesmen.html` state 1 | Mode fokus tanpa sidebar, satu pertanyaan per layar, keyboard 1–4                                                                                     |
| `/asesmen/hasil/[id]` | `app-asesmen.html` state 2 | Banner krisis kondisional, skor besar, skala 4 kategori, rekomendasi, kontrol berbagi + SATUSEHAT                                                     |
| `/privasi`            | `app-privasi.html`         | Izin per orang per jenis data, cabut semua, riwayat akses, SATUSEHAT                                                                                  |
| `/teman-cerita`       | `app-teman-cerita.html`    | Orb bernapas (4 detik), disclaimer tetap, chip saran balasan, indikator mengetik saat streaming                                                       |
| `/psikolog`           | `psikolog-dashboard.html`  | Kartu alert krisis realtime di atas, statistik, tabel klien (tren + titik mood), jadwal hari ini                                                      |
| `/faskes`             | `faskes-dashboard.html`    | Pesan anonimitas di atas, tren mingguan dengan pita periode (mis. UTS), perbandingan kota (yang < 10 diarsir), sebaran per usia, ajakan integrasi API |

Halaman tanpa mockup — susun dari komponen yang sama:

- **`/jurnal`**: form check-in mood (kerikil yang sama dengan beranda) + energi (1–5, segmented) +
  chip pemicu + catatan; form tidur (jam tidur/bangun, kualitas 1–5); riwayat dalam bentuk daftar per hari.
- **`/konsultasi`**: kartu psikolog (foto/avatar, nama, gelar, spesialisasi sebagai chip, tarif,
  badge "Terverifikasi HIMPSI"), filter chip, halaman detail dengan slot per hari (tombol pill
  berisi jam), dialog konfirmasi, daftar "Booking saya".
- **`/psikolog/klien/[id]`**: header klien + izin yang diberikan, tab Skrining / Mood dan tidur /
  Catatan sesi; grafik memakai gaya yang sama dengan faskes.
- **`/pendamping`**: seperti beranda versi ringkas untuk orang yang didampingi + panduan tanda bahaya;
  hanya kartu yang diizinkan yang tampil, sisanya `EmptyState` "Belum dibagikan".
- **`/masuk`, `/daftar`**: kartu tengah 440px di atas krem, logo, field 48px, tombol primary block,
  tautan sekunder. Pilihan peran saat daftar: "Untuk diriku sendiri" (default) atau "Saya psikolog"
  (masuk antrian verifikasi).
- **`/developers`**: Scalar API reference dengan tema warna Mindra.

## Status kosong, loading, error

- Kosong = ajakan bertindak: "Belum ada catatan minggu ini. Mulai dengan satu check-in."
- Loading = `Skeleton` berbentuk kartu (tanpa spinner di halaman penuh).
- Error = jelaskan apa yang terjadi dan cara memperbaikinya, tanpa minta maaf berlebihan:
  "Jawabanmu belum tersimpan karena koneksi terputus. Coba kirim lagi."

## Aksesibilitas

- Fokus: `--glow-biru` di semua elemen interaktif. Skip link di setiap layout.
- Grafik selalu punya `role="img"` + `aria-label` yang membacakan intinya (lihat mockup).
- Banner krisis `role="alert"` dan menerima fokus saat muncul. Alert realtime psikolog di region `aria-live`.
- Switch memakai `role="switch"` + `aria-checked` + label yang menyebut orang dan jenis data.
- Kerikil mood: `aria-pressed`, teks label selalu terlihat (bukan hanya gambar).
- Hormati `profiles.font_size_preference` (small/normal/large → skala root 0.9/1/1.15).
