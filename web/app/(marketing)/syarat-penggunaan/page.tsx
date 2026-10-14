import type { Metadata } from 'next';
import Link from 'next/link';
import { ProseSection } from '@/components/features/marketing/ProseSection';
import { Container } from '@/components/layout/Container';
import { Alert } from '@/components/ui/Alert';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import { LEGAL_UPDATED_AT, LEGAL_VERSION, MIN_AGE } from '@/lib/legal/version';

export const metadata: Metadata = {
  title: 'Syarat penggunaan',
  description:
    'Ketentuan layanan Mindra untuk aplikasi web dan mobile: batas layanan, usia, akun, konsultasi, Teman cerita, dan penghapusan akun.',
  alternates: { canonical: '/syarat-penggunaan' },
};

const bullets = 'grid list-disc gap-1.5 pl-5';

export default function TermsPage() {
  return (
    <Container className="pt-12 pb-24">
      <article className="max-w-reading">
        <p className="meta">
          Berlaku sejak {LEGAL_UPDATED_AT} · Versi {LEGAL_VERSION}
        </p>
        <h1 className="mt-1 display-3">Syarat penggunaan</h1>
        <p className="mt-4 lead">
          Aturan main memakai Mindra, di web maupun di aplikasi mobile. Satu naskah untuk keduanya,
          karena keduanya memakai satu akun dan satu data.
        </p>

        <Alert tone="note" title="Rancangan untuk versi demo" titleAs="h2" className="mt-6">
          <p className="mt-1 text-sm">
            Naskah ini berangkat dari ketentuan aplikasi mobile Mindra dan disesuaikan dengan cara
            kerja web saat ini. Naskah ini belum ditinjau ahli hukum, dan kontak resmi penyelenggara
            belum dicantumkan. Sebelum dirilis untuk umum, keduanya perlu dilengkapi.
          </p>
        </Alert>

        <ProseSection id="darurat" title="1. Mindra bukan layanan darurat">
          <Alert tone="crisis" title="Kalau kamu atau seseorang dalam bahaya" titleAs="h3">
            <p className="mt-1 text-sm">
              Jangan menunggu hasil apa pun dari Mindra. Hubungi {PRIMARY_CRISIS_RESOURCE.name} di{' '}
              <a href={PRIMARY_CRISIS_RESOURCE.telHref}>{PRIMARY_CRISIS_RESOURCE.displayNumber}</a>{' '}
              ({PRIMARY_CRISIS_RESOURCE.availability}), nomor darurat nasional 112, unit gawat
              darurat terdekat, atau orang tepercaya di sekitarmu.
            </p>
          </Alert>
          <p>
            Mindra adalah alat pendamping, bukan layanan medis darurat dan bukan pengganti
            penanganan profesional kesehatan jiwa.
          </p>
        </ProseSection>

        <ProseSection id="layanan" title="2. Yang disediakan">
          <ul className={bullets}>
            <li>Skrining mandiri (PHQ-9, GAD-7, PSS-10, SRQ-20).</li>
            <li>Jurnal mood dan tidur serta ringkasan mingguan.</li>
            <li>Teman cerita, obrolan dengan AI.</li>
            <li>Pemesanan konsultasi dengan psikolog yang terdaftar di Mindra.</li>
            <li>
              Pengelolaan izin berbagi data dengan psikolog dan pendamping, serta riwayat siapa yang
              membuka datamu.
            </li>
            <li>
              Untuk layanan kesehatan dan sistem mitra: angka gabungan tanpa nama dan{' '}
              <Link href="/developers">API publik</Link>.
            </li>
          </ul>
          <p>
            Sifatnya mendukung dan mendidik. Mindra tidak memberikan diagnosis medis, resep, atau
            tindakan klinis.
          </p>
        </ProseSection>

        <ProseSection id="skrining" title="3. Hasil skrining bukan diagnosis">
          <p>
            Skor dan kategori menunjukkan seberapa berat yang kamu rasakan belakangan ini. Itu bahan
            refleksi dan bahan bercerita kepada tenaga kesehatan jiwa. Hanya profesional
            berkualifikasi yang dapat menegakkan diagnosis.
          </p>
        </ProseSection>

        <ProseSection id="usia" title={`4. Usia dan kelayakan`}>
          <p>
            Kamu harus berusia <strong className="text-fg-1">minimal {MIN_AGE} tahun</strong> dan
            mampu menyetujui ketentuan ini. Saat mendaftar, kamu diminta menyatakannya; kami tidak
            mengumpulkan data dari pengguna di bawah usia itu dengan sengaja.
          </p>
        </ProseSection>

        <ProseSection id="akun" title="5. Akun">
          <ul className={bullets}>
            <li>Jaga kerahasiaan kata sandimu. Aktivitas di akunmu menjadi tanggung jawabmu.</li>
            <li>
              Berikan informasi yang benar, dan beri tahu kami bila akunmu dipakai orang lain.
            </li>
            <li>
              Akun psikolog ditinjau admin Mindra sebelum bisa melihat klien, dan wajib memakai
              verifikasi dua langkah. Selama ditinjau, akunmu berfungsi seperti akun pengguna biasa.
            </li>
            <li>
              Pendamping hanya melihat apa yang diizinkan pemilik data, dan izin itu bisa dicabut
              kapan saja.
            </li>
          </ul>
        </ProseSection>

        <ProseSection id="aturan" title="6. Yang tidak boleh dilakukan">
          <ul className={bullets}>
            <li>Memakai Mindra untuk tujuan melanggar hukum atau merugikan orang lain.</li>
            <li>
              Mengganggu keamanan, merekayasa balik, atau menyalahgunakan layanan dan API-nya.
            </li>
            <li>Mengakses data pengguna lain tanpa izin.</li>
            <li>Memakai fitur pendamping untuk memantau seseorang tanpa persetujuan sahnya.</li>
            <li>
              Mengunggah atau menulis konten yang melanggar hukum, mengancam, atau melecehkan.
            </li>
          </ul>
          <p>Akun yang melanggar dapat ditangguhkan atau dihentikan.</p>
        </ProseSection>

        <ProseSection id="konsultasi" title="7. Konsultasi dengan psikolog">
          <ul className={bullets}>
            <li>
              Mindra memfasilitasi pemesanan. Psikolog adalah praktisi independen, dan hubungan
              profesionalnya terjalin antara kamu dan psikolog itu.
            </li>
            <li>Mindra tidak bertanggung jawab atas nasihat klinis yang diberikan dalam sesi.</li>
            <li>
              Tarif tampil sebagai informasi.{' '}
              <strong className="text-fg-1">Versi ini belum memproses pembayaran</strong>, dan
              panggilan video belum tersedia di web.
            </li>
            <li>
              Satu psikolog tidak bisa dipesan dua orang pada jam yang sama, dan kamu tidak bisa
              memiliki dua sesi yang berimpitan. Sesi mendatang dibatasi tiga per orang.
            </li>
          </ul>
        </ProseSection>

        <ProseSection id="ai" title="8. Teman cerita (AI)">
          <p>
            Teman cerita adalah fitur obrolan otomatis. Ia bukan tenaga profesional, tidak memberi
            nasihat medis, dan jawabannya bisa keliru. Jangan menjadikannya dasar keputusan medis.
            Bila pesanmu memuat tanda bahaya, Mindra menjawab dengan balasan tetap yang
            mengarahkanmu ke bantuan manusia, tanpa memanggil model AI. Isi percakapan lainnya
            diproses penyedia model (lihat{' '}
            <Link href="/kebijakan-privasi#pemroses">kebijakan privasi</Link>).
          </p>
        </ProseSection>

        <ProseSection id="satusehat" title="9. SATUSEHAT">
          <p>
            Pengiriman hasil skrining ke SATUSEHAT bersifat sukarela dan memerlukan persetujuanmu,
            yang bisa kamu cabut kapan saja. Data yang sudah terkirim tunduk pada kebijakan rekam
            medis nasional. Di versi demo ini, pengirimannya masih berjalan sebagai simulasi lokal.
          </p>
        </ProseSection>

        <ProseSection id="wilayah" title="10. Statistik wilayah anonim">
          <p>
            Kamu bisa memilih ikut (dan berhenti kapan saja) agar kotamu dihitung dalam angka
            gabungan anonim untuk puskesmas, dinas, dan mitra di provinsimu. Pilihan ini mati
            bawaannya. Angka hanya tampil untuk kelompok minimal 10 orang, dan tidak pernah memuat
            nama atau data perorangan.
          </p>
        </ProseSection>

        <ProseSection id="hki" title="11. Hak kekayaan intelektual">
          <p>
            Konten, desain, merek, dan perangkat lunak Mindra dilindungi hak kekayaan intelektual.
            Instrumen klinis (PHQ-9, GAD-7, PSS-10, SRQ-20) adalah instrumen standar yang dipakai
            sesuai ketentuan masing-masing.
          </p>
        </ProseSection>

        <ProseSection id="batas" title="12. Batas tanggung jawab">
          <p>Sejauh diizinkan hukum yang berlaku:</p>
          <ul className={bullets}>
            <li>Mindra disediakan sebagaimana adanya, tanpa jaminan tertentu.</li>
            <li>
              Kami tidak bertanggung jawab atas keputusan yang kamu ambil semata-mata dari informasi
              di Mindra.
            </li>
            <li>
              Kami tidak bertanggung jawab atas kerugian karena tidak bisa menjangkau layanan
              darurat lewat Mindra.
            </li>
          </ul>
          <p>
            Pemulihan kesehatan mental adalah proses yang tidak bergantung sepenuhnya pada aplikasi
            ini. Ketentuan ini tidak membatasi tanggung jawab yang menurut hukum tidak dapat
            dikecualikan.
          </p>
        </ProseSection>

        <ProseSection id="penghentian" title="13. Berhenti dan menghapus akun">
          <p>
            Kamu bisa berhenti kapan saja. Untuk menghapus akun dan seluruh datanya, buka{' '}
            <strong className="text-fg-1">Profil &gt; Hapus akun</strong> di web (atau menu profil
            di aplikasi). Kami dapat menangguhkan atau menghentikan akses bila ada pelanggaran.
            Rinciannya ada di <Link href="/kebijakan-privasi#kendali">kebijakan privasi</Link>.
          </p>
        </ProseSection>

        <ProseSection id="perubahan" title="14. Perubahan dan hukum yang berlaku">
          <p>
            Ketentuan ini bisa diperbarui; tanggal dan versi di bagian atas halaman ikut berubah,
            dan perubahan penting diberitahukan lewat aplikasi atau web. Ketentuan ini tunduk pada
            hukum Republik Indonesia; sengketa diselesaikan lewat musyawarah, lalu forum hukum yang
            berwenang di Indonesia.
          </p>
        </ProseSection>

        <ProseSection id="kontak" title="15. Kontak">
          <p>
            Kontak resmi untuk pertanyaan tentang ketentuan ini akan dicantumkan di sini saat Mindra
            dirilis untuk umum. Tentang tujuan produk, lihat{' '}
            <Link href="/tentang">halaman tentang</Link>.
          </p>
        </ProseSection>
      </article>
    </Container>
  );
}
