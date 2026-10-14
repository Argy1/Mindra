import type { Metadata } from 'next';
import Link from 'next/link';
import { ProseSection } from '@/components/features/marketing/ProseSection';
import { Container } from '@/components/layout/Container';
import { Alert } from '@/components/ui/Alert';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';

export const metadata: Metadata = {
  title: 'Tentang Mindra',
  description:
    'Mindra adalah ekosistem kesehatan mental digital: aplikasi mobile dan web yang berbagi satu backend, terhubung ke psikolog, keluarga, layanan kesehatan, dan SATUSEHAT atas izin pengguna.',
  alternates: { canonical: '/tentang' },
};

export default function AboutPage() {
  return (
    <Container className="pt-12 pb-24">
      <article className="max-w-reading">
        <p className="meta">Tentang</p>
        <h1 className="mt-1 display-3">Mindra, ruang aman untuk perasaanmu</h1>
        <p className="mt-4 lead">
          Mindra membantu kamu mengenali perasaan setiap hari, lalu menghubungkannya ke orang yang
          bisa membantu, kalau dan hanya kalau kamu mau.
        </p>

        <ProseSection id="apa" title="Apa yang dibuat">
          <p>
            Mindra terdiri dari dua aplikasi yang memakai satu backend: aplikasi mobile (Flutter)
            dan aplikasi web ini. Catatan yang kamu buat di satu tempat langsung terlihat di tempat
            lain, dengan aturan izin yang sama.
          </p>
          <p>
            Di dalamnya ada skrining singkat (PHQ-9, GAD-7, PSS-10, dan SRQ-20), jurnal mood dan
            tidur, teman cerita berbasis AI, serta pemesanan sesi dengan psikolog. Psikolog dan
            pendamping hanya melihat apa yang kamu izinkan, dan setiap pembukaan datamu tercatat di
            riwayat akses yang bisa kamu baca.
          </p>
        </ProseSection>

        <ProseSection id="terhubung" title="Siapa yang terhubung">
          <ul className="grid list-disc gap-1.5 pl-5">
            <li>
              <strong className="text-fg-1">Kamu</strong> memegang kuncinya: kamu yang memilih siapa
              boleh melihat apa, dan bisa mencabutnya kapan saja.
            </li>
            <li>
              <strong className="text-fg-1">Psikolog</strong> melihat perkembangan klien di antara
              sesi dan menerima peringatan krisis, sebatas yang diizinkan.
            </li>
            <li>
              <strong className="text-fg-1">Keluarga dan pendamping</strong> ikut menjaga pada hal
              yang kamu izinkan.
            </li>
            <li>
              <strong className="text-fg-1">Puskesmas dan dinas kesehatan</strong> hanya menerima
              angka gabungan tanpa nama dari minimal 10 orang.
            </li>
            <li>
              <strong className="text-fg-1">SATUSEHAT</strong> menerima hasil skrining hanya setelah
              kamu menyetujuinya. Di versi demo ini, pengirimannya masih berjalan sebagai simulasi
              lokal; belum ada data yang masuk ke rekam kesehatan nasional.
            </li>
          </ul>
          <p>
            Sistem lain bisa terhubung lewat <Link href="/developers">API publik</Link> berformat
            FHIR R4.
          </p>
        </ProseSection>

        <ProseSection id="batas" title="Yang bukan Mindra">
          <Alert tone="info" title="Alat skrining dan pendamping, bukan diagnosis" titleAs="h3">
            Hasil skrining menunjukkan seberapa berat yang kamu rasakan belakangan ini. Hanya
            psikolog atau dokter yang bisa menilai kondisimu secara menyeluruh. Mindra juga bukan
            layanan gawat darurat.
          </Alert>
          <p>
            Kalau kamu sedang dalam bahaya atau berpikir untuk menyakiti diri, jangan menunggu hasil
            apa pun. Hubungi {PRIMARY_CRISIS_RESOURCE.name} di{' '}
            <a href={PRIMARY_CRISIS_RESOURCE.telHref}>{PRIMARY_CRISIS_RESOURCE.displayNumber}</a> (
            {PRIMARY_CRISIS_RESOURCE.availability}), atau orang terdekat yang bisa menemanimu.
          </p>
          <p>
            Teman cerita adalah AI. Ia mendengarkan dan menemani, tidak menggantikan psikolog, dan
            tidak memberi diagnosis atau resep.
          </p>
        </ProseSection>

        <ProseSection id="lomba" title="Dibuat untuk">
          <p>
            Mindra Web dikembangkan untuk UINIC 8.0 Web Development Competition 2026, dengan tema
            “Engineering Interconnected Web Solutions to Empower Digital Ecosystems” pada subtema
            kesehatan. Kode, dokumentasi arsitektur, dan hasil pengujiannya tersedia di repositori
            proyek.
          </p>
          <p>
            Soal data kamu, baca <Link href="/kebijakan-privasi">kebijakan privasi</Link>.
          </p>
        </ProseSection>
      </article>
    </Container>
  );
}
