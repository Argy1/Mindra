import type { Metadata } from 'next';
import Link from 'next/link';
import { ProseSection } from '@/components/features/marketing/ProseSection';
import { Container } from '@/components/layout/Container';
import { Alert } from '@/components/ui/Alert';
import { LEGAL_UPDATED_AT, LEGAL_VERSION, MIN_AGE } from '@/lib/legal/version';

export const metadata: Metadata = {
  title: 'Kebijakan privasi',
  description:
    'Data apa yang Mindra simpan, siapa yang bisa melihatnya, ke mana datamu mengalir, dan apa yang bisa kamu kendalikan, termasuk menghapus akun.',
  alternates: { canonical: '/kebijakan-privasi' },
};

const DATA_ROWS = [
  [
    'Akun',
    'Nama, alamat email, kata sandi (hanya bentuk ter-hash), peran akun, dan versi naskah yang kamu setujui.',
  ],
  [
    'Profil (opsional)',
    'Kota dan provinsi domisili, tanggal lahir, dan jenis kelamin bila kamu mengisinya, serta preferensi tampilan seperti ukuran teks.',
  ],
  [
    'Skrining',
    'Jawaban per butir, skor total, dan kategori hasil dari PHQ-9, GAD-7, PSS-10, dan SRQ-20.',
  ],
  [
    'Jurnal',
    'Mood harian dan catatanmu, serta catatan tidur. Di aplikasi mobile: refleksi malam, latihan CBT, dan jurnal suara.',
  ],
  [
    'Teman cerita',
    'Isi percakapanmu dengan teman cerita, dan peringatan krisis bila pesanmu memuat tanda bahaya.',
  ],
  [
    'Berbagi dan konsultasi',
    'Izin yang kamu berikan ke psikolog dan pendamping, jadwal sesi, dan catatan sesi yang ditulis psikolog.',
  ],
  [
    'Riwayat akses',
    'Siapa membuka bagian datamu yang mana dan kapan (psikolog, pendamping, atau admin faskes).',
  ],
  [
    'SATUSEHAT',
    'Catatan pengiriman hasil skrining ke SATUSEHAT, hanya bila kamu menyalakan persetujuannya.',
  ],
] as const;

const VIEWER_ROWS = [
  ['Kamu', 'Semua datamu sendiri.'],
  [
    'Psikolog yang kamu hubungkan',
    'Hanya bagian yang kamu izinkan (hasil skrining, mood, tidur, peringatan krisis, ringkasan teman cerita). Setiap pembukaan tercatat. Akun psikolog wajib memakai verifikasi dua langkah (MFA).',
  ],
  [
    'Pendamping yang kamu undang',
    'Hanya bagian yang kamu izinkan. Bawaannya mood harian dan peringatan darurat; hasil skrining dan aktivitas aplikasi mati sampai kamu menyalakannya.',
  ],
  [
    'Puskesmas, dinas, dan mitra',
    'Hanya angka gabungan tanpa nama untuk wilayahnya, dan hanya dari pengguna yang MEMILIH ikut (lihat bagian statistik wilayah). Kelompok yang terdiri dari kurang dari 10 orang disembunyikan seluruhnya. Tidak pernah data individu.',
  ],
  [
    'Admin Mindra',
    'Hanya yang perlu untuk meninjau akun psikolog (nama, email, dan data praktik pemohon). Admin tidak membuka catatan kesehatan siapa pun, dan setiap keputusannya tercatat.',
  ],
  [
    'SATUSEHAT (Kemenkes)',
    'Skor total dan interpretasinya (bukan jawaban per butir), hanya setelah kamu menyetujui. Di versi demo ini, pengiriman berjalan sebagai simulasi lokal dan tidak ada data yang keluar dari server Mindra.',
  ],
] as const;

const PROCESSOR_ROWS = [
  [
    'Supabase',
    'Basis data dan autentikasi. Datamu disimpan di proyek Supabase Mindra (wilayah Singapura) dan dijaga aturan akses per baris.',
  ],
  ['Vercel', 'Hosting aplikasi web.'],
  [
    'Upstash',
    'Pembatasan laju permintaan. Menyimpan penghitung sementara per alamat IP atau akun, bukan isi data kesehatan.',
  ],
  [
    'Anthropic',
    'Menghasilkan balasan teman cerita. Isi percakapanmu dikirim ke sana, tanpa nama, email, atau pengenal akunmu. Pesan yang terdeteksi memuat tanda krisis dijawab dengan balasan tetap dari Mindra dan tidak dikirim ke model.',
  ],
  [
    'OpenStreetMap',
    'Hanya untuk dasbor faskes: peta memuat ubin gambar dari server OpenStreetMap, sehingga alamat IP browser admin faskes terlihat oleh mereka.',
  ],
] as const;

const th = 'px-3 pb-2 text-left text-xs font-semibold text-fg-3';
const td = 'border-t border-line-soft px-3 py-3 align-top text-sm';
const bullets = 'grid list-disc gap-1.5 pl-5';

function RowsTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: readonly [string, string];
  rows: readonly (readonly [string, string])[];
}) {
  return (
    <div role="group" aria-label={caption} tabIndex={0} className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              {head[0]}
            </th>
            <th scope="col" className={th}>
              {head[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, text]) => (
            <tr key={label}>
              <th scope="row" className={`${td} w-[30%] text-left font-semibold text-fg-1`}>
                {label}
              </th>
              <td className={`${td} text-fg-2`}>{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <Container className="pt-12 pb-24">
      <article className="max-w-reading">
        <p className="meta">
          Berlaku sejak {LEGAL_UPDATED_AT} · Versi {LEGAL_VERSION}
        </p>
        <h1 className="mt-1 display-3">Kebijakan privasi</h1>
        <p className="mt-4 lead">
          Catatan perasaan adalah data yang sangat pribadi. Halaman ini menjelaskan apa yang kami
          simpan, siapa yang bisa melihatnya, dan apa yang bisa kamu kendalikan. Naskah ini berlaku
          untuk web dan aplikasi mobile Mindra, karena keduanya memakai satu akun dan satu basis
          data.
        </p>

        <Alert tone="note" title="Rancangan untuk versi demo" titleAs="h2" className="mt-6">
          <p className="mt-1 text-sm">
            Mindra Web masih berupa karya lomba. Teks ini menggambarkan cara sistemnya bekerja saat
            ini dan dirancang dengan memperhatikan UU No. 27 Tahun 2022 tentang Pelindungan Data
            Pribadi dan peraturan pelaksanaannya, yaitu PP No. 33 Tahun 2026 (berlaku mulai 16
            Januari 2027), tetapi belum ditinjau ahli hukum. Sebelum dirilis untuk umum, teks ini
            perlu ditinjau, dan kontak resmi pengelola data dicantumkan.
          </p>
        </Alert>

        <ProseSection id="ringkas" title="Ringkasnya">
          <ul className={bullets}>
            <li>
              Tidak ada yang melihat catatanmu tanpa izinmu, dan izin bisa kamu cabut kapan saja.
            </li>
            <li>
              Setiap kali psikolog atau pendamping membuka datamu, tercatat dan bisa kamu lihat di
              halaman Privasi.
            </li>
            <li>
              Layanan kesehatan hanya menerima angka gabungan tanpa nama dari minimal 10 orang, dan
              hanya dari pengguna yang memilih ikut.
            </li>
            <li>Kamu bisa mengunduh dan menghapus seluruh datamu sendiri dari halaman Profil.</li>
            <li>Kami tidak memasang pelacak iklan atau analitik pihak ketiga.</li>
          </ul>
        </ProseSection>

        <ProseSection id="data" title="Data yang kami simpan">
          <RowsTable caption="Jenis data yang disimpan" head={['Jenis', 'Isi']} rows={DATA_ROWS} />
          <p>
            Data diproses atas dasar persetujuanmu, yang bisa kamu tarik kapan saja, dan untuk
            menjalankan layanan yang kamu minta. Data kesehatan mental diperlakukan sebagai data
            pribadi yang spesifik dan mendapat perlindungan lebih ketat.
          </p>
        </ProseSection>

        <ProseSection id="siapa" title="Siapa yang bisa melihat">
          <RowsTable
            caption="Pihak yang bisa melihat datamu"
            head={['Pihak', 'Yang bisa dilihat']}
            rows={VIEWER_ROWS}
          />
          <p>
            Aturan ini dijaga di tingkat basis data (aturan akses per baris), bukan hanya di
            tampilan, jadi tetap berlaku bila seseorang mencoba mengakses data lewat jalur lain.
          </p>
        </ProseSection>

        <ProseSection id="wilayah" title="Statistik wilayah anonim (pilihanmu)">
          <p>
            Puskesmas dan dinas kesehatan butuh gambaran tren di wilayahnya untuk merencanakan
            layanan. Kamu bisa membantu dengan menyalakan{' '}
            <strong className="text-fg-1">Ikut statistik wilayah anonim</strong> di Profil. Pilihan
            ini <strong className="text-fg-1">mati bawaannya</strong>.
          </p>
          <ul className={bullets}>
            <li>
              Kalau menyala, kota dan provinsimu dipakai untuk menempatkan hasil skrining dan
              aktivitasmu ke dalam angka gabungan wilayah. Tidak ada nama atau pengenal yang ikut.
            </li>
            <li>
              Angka hanya tampil bila sedikitnya 10 orang berkontribusi pada kota dan pekan yang
              sama. Kelompok yang lebih kecil disembunyikan seluruhnya.
            </li>
            <li>
              Kalau kamu mematikannya atau mengosongkan kota atau provinsimu, datamu langsung tidak
              dihitung lagi pada permintaan angka berikutnya.
            </li>
          </ul>
        </ProseSection>

        <ProseSection id="pemroses" title="Layanan pihak ketiga yang ikut memproses">
          <RowsTable
            caption="Layanan pihak ketiga"
            head={['Layanan', 'Perannya']}
            rows={PROCESSOR_ROWS}
          />
          <p>
            Masing-masing punya kebijakan sendiri. Kami memilih mengirim sesedikit mungkin dan tidak
            pernah menjual data atau memakainya untuk iklan.
          </p>
        </ProseSection>

        <ProseSection id="kendali" title="Yang bisa kamu kendalikan">
          <ul className={bullets}>
            <li>
              <strong className="text-fg-1">Mencabut izin</strong> psikolog atau pendamping kapan
              saja. Berlaku saat itu juga.
            </li>
            <li>
              <strong className="text-fg-1">Membaca riwayat akses</strong> dan mengunduhnya sebagai
              berkas CSV dari halaman Privasi.
            </li>
            <li>
              <strong className="text-fg-1">Memperbaiki data profilmu</strong> (nama, kota,
              provinsi) dan mengatur statistik wilayah dari halaman Profil.
            </li>
            <li>
              <strong className="text-fg-1">Mengunduh salinan datamu</strong> sebagai berkas JSON
              dari halaman Profil (skrining, mood, tidur, percakapan, konsultasi, izin, dan riwayat
              akses).
            </li>
            <li>
              <strong className="text-fg-1">Mematikan persetujuan SATUSEHAT</strong> kapan saja.
              Pengiriman berikutnya berhenti.
            </li>
            <li>
              <strong className="text-fg-1">Menghapus akun</strong> beserta seluruh datanya dari
              halaman Profil (perlu memasukkan kata sandimu lagi). Penghapusan berlangsung seketika
              di basis data kami. Salinan cadangan yang dikelola penyedia basis data dapat tersimpan
              sampai siklus cadangannya berakhir, dan data yang sudah terkirim ke SATUSEHAT berada
              di luar kendali kami.
            </li>
          </ul>
          <p>
            Akun psikolog, pendamping, admin faskes, dan admin tidak punya tombol hapus mandiri
            karena terkait dengan data orang lain (mis. peringatan krisis yang ditandai ditangani);
            mintalah lewat kontak resmi yang akan dicantumkan saat Mindra dirilis.
          </p>
        </ProseSection>

        <ProseSection id="anak" title="Pengguna di bawah usia">
          <p>
            Mindra ditujukan untuk pengguna berusia {MIN_AGE} tahun ke atas. Saat mendaftar kamu
            diminta menyatakannya. Kami tidak dengan sengaja mengumpulkan data dari yang lebih muda;
            bila kamu yakin seseorang di bawah usia itu sudah mendaftar, beri tahu kami agar akunnya
            dihapus.
          </p>
        </ProseSection>

        <ProseSection id="keamanan" title="Keamanan">
          <ul className={bullets}>
            <li>Koneksi terenkripsi (HTTPS) dan header keamanan standar di setiap halaman.</li>
            <li>Kunci rahasia hanya ada di server, tidak pernah dikirim ke browser.</li>
            <li>
              Pembatasan laju permintaan terhadap penyalahgunaan, dan validasi di setiap masukan.
            </li>
            <li>
              Akun psikolog, admin faskes, dan admin memakai verifikasi dua langkah yang ditegakkan
              di basis data.
            </li>
            <li>
              Rekaman jurnal suara di aplikasi mobile dienkripsi AES-256 di perangkatmu sebelum
              diunggah.
            </li>
          </ul>
          <p>
            Tidak ada sistem yang sepenuhnya aman. Kalau kami menemukan kebocoran yang menyangkut
            datamu, kami akan memberi tahu pengguna yang terdampak.
          </p>
        </ProseSection>

        <ProseSection id="cookie" title="Cookie">
          <p>
            Kami hanya memakai cookie yang diperlukan agar kamu tetap masuk (sesi masuk). Tidak ada
            cookie iklan atau pelacakan. Font disajikan dari server kami sendiri, jadi membuka
            halaman ini tidak mengirim permintaan ke pihak lain.
          </p>
        </ProseSection>

        <ProseSection id="kontak" title="Pertanyaan dan perubahan">
          <p>
            Kalau kebijakan ini berubah, tanggal dan versi di bagian atas halaman ikut berubah dan
            perubahan penting diberitahukan lewat web atau aplikasi. Kontak resmi untuk pertanyaan
            tentang datamu (termasuk keluhan kepada lembaga pengawas yang berwenang) akan
            dicantumkan di sini saat Mindra dirilis untuk umum. Aturan memakai layanan ada di{' '}
            <Link href="/syarat-penggunaan">syarat penggunaan</Link>; tentang tujuan produk, lihat{' '}
            <Link href="/tentang">halaman tentang</Link>.
          </p>
        </ProseSection>
      </article>
    </Container>
  );
}
