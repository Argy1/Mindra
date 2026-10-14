import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Buildings,
  CheckCircle,
  ShieldCheck,
  Stethoscope,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react/ssr';
import type { ComponentType } from 'react';
import { AccessLogSample } from '@/components/features/marketing/AccessLogSample';
import { ApiExample } from '@/components/features/marketing/ApiExample';
import { EcosystemDiagram } from '@/components/features/marketing/EcosystemDiagram';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { siteUrl } from '@/lib/env/public';

export const metadata: Metadata = {
  title: { absolute: 'Mindra — Ruang aman untuk perasaanmu' },
  alternates: { canonical: '/' },
};

const INAMHS_SUMMARY_URL =
  'https://ugm.ac.id/en/news/23169-burden-of-adolescent-mental-disorders-in-indonesia-results-from-indonesia-s-first-national-mental-health-survey/';

/** Urutan nyata, jadi boleh bernomor. Langkah 4 jujur soal mode simulasi SATUSEHAT di versi demo. */
const STEPS = [
  {
    title: 'Kenali',
    text: 'Isi skrining singkat (PHQ-9, GAD-7, PSS-10, SRQ-20) dan catat mood serta tidurmu. Cukup beberapa menit sehari.',
  },
  {
    title: 'Pahami',
    text: 'Lihat pola mingguanmu: kapan perasaan terasa berat, dan apa hubungannya dengan tidurmu.',
  },
  {
    title: 'Terhubung',
    text: 'Hubungkan psikolog atau keluarga yang kamu pilih dan atur sendiri apa yang boleh mereka lihat. Kalau ada tanda bahaya dan kamu mengizinkannya, mereka langsung diberi tahu.',
  },
  {
    title: 'Tercatat',
    text: 'Dengan persetujuanmu, hasil skrining bisa dikirim ke SATUSEHAT dalam format FHIR. Di versi demo ini, pengiriman tersebut masih berjalan sebagai simulasi.',
  },
] as const;

interface Audience {
  title: string;
  text: string;
  Icon: ComponentType<{ 'aria-hidden'?: boolean; weight?: 'duotone'; className?: string }>;
}

const AUDIENCES: readonly Audience[] = [
  {
    title: 'Kamu',
    text: 'Skrining, jurnal mood dan tidur, teman cerita, dan pemesanan sesi dengan psikolog, di web maupun aplikasi mobile.',
    Icon: UserCircle,
  },
  {
    title: 'Psikolog',
    text: 'Melihat perkembangan klien di antara sesi, sebatas yang diizinkan klien, dan menerima peringatan krisis secara langsung.',
    Icon: Stethoscope,
  },
  {
    title: 'Keluarga dan pendamping',
    text: 'Ikut menjaga, hanya pada hal yang kamu izinkan. Bukan memata-matai.',
    Icon: UsersThree,
  },
  {
    title: 'Puskesmas dan dinas',
    text: 'Tren kesehatan mental wilayahnya dalam bentuk anonim, untuk merencanakan layanan.',
    Icon: Buildings,
  },
];

const PRIVACY_POINTS = [
  'Setiap izin bisa dicabut kapan saja, berlaku saat itu juga.',
  'Setiap kali psikolog atau pendamping membuka datamu, tercatat dan bisa kamu lihat.',
  'Puskesmas hanya menerima angka gabungan dari minimal 10 orang. Tidak pernah namamu.',
] as const;

const sectionTop = 'border-t border-line-soft';

export default function LandingPage() {
  return (
    <>
      <Container className="grid grid-cols-1 items-center gap-12 pt-6 pb-24 shell:grid-cols-[1.05fr_1fr] shell:pt-14">
        <div>
          <h1 className="max-w-[14ch] display-1">
            Ruang aman untuk perasaanmu, terhubung ke yang bisa membantu.
          </h1>
          <p className="mt-6 lead">
            Mindra menemanimu mengenali perasaan setiap hari. Kalau kamu mau, catatanmu bisa
            dibagikan ke psikolog, keluarga, dan layanan kesehatan. Kamu yang memegang kuncinya.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button href="/daftar" size="lg">
              Mulai cek perasaan
            </Button>
            <Button href="#cara-kerja" variant="secondary" size="lg">
              Lihat cara kerjanya
            </Button>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-fg-3">
            <ShieldCheck aria-hidden className="size-[1.125rem] shrink-0 text-sage-600" />
            Skrining dan jurnalnya gratis, berbahasa Indonesia, dan datamu tidak dibagikan tanpa
            izinmu.
          </p>
        </div>
        <EcosystemDiagram />
      </Container>

      <section aria-labelledby="fakta">
        <Container
          className={`${sectionTop} grid grid-cols-1 items-start gap-6 py-22 nav:grid-cols-2 nav:gap-14`}
        >
          <h2 id="fakta" className="max-w-[16ch] display-2">
            1 dari 3 remaja Indonesia punya masalah kesehatan mental dalam setahun.
          </h2>
          <div>
            <p className="lead">
              Dari mereka, hanya sekitar 2,6% yang mengakses layanan bantuan atau konseling dalam
              periode yang sama. Banyak keluarga memilih menangani sendiri atau bersama orang
              terdekat. Mindra memendekkan jaraknya: mulai dari mengenali perasaan sendiri, sampai
              bertemu orang yang tepat.
            </p>
            <p className="mt-4 text-[0.8125rem] text-fg-3">
              Sumber: Indonesia National Adolescent Mental Health Survey (I-NAMHS), remaja usia
              10–17 tahun, laporan 2022.{' '}
              <a href={INAMHS_SUMMARY_URL} rel="noopener noreferrer" target="_blank">
                Ringkasan hasil di situs UGM (bahasa Inggris)
              </a>
              . Angka ini menggambarkan keluhan pada tingkat populasi, bukan diagnosis siapa pun.
            </p>
          </div>
        </Container>
      </section>

      <section id="cara-kerja" aria-labelledby="h-cara">
        <Container className="py-22">
          <h2 id="h-cara" className="display-2">
            Cara kerjanya
          </h2>
          <ol className="mt-12 grid list-none grid-cols-1 gap-7 p-0 nav:grid-cols-4 nav:gap-0">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative nav:pr-6">
                <span
                  aria-hidden
                  className="relative z-10 mb-5 grid size-10 place-items-center rounded-full bg-raised font-bold text-biru-600 shadow-sm"
                >
                  {index + 1}
                </span>
                {index < STEPS.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute top-5 right-0 left-10 hidden h-[1.5px] bg-line-medium nav:block"
                  />
                ) : null}
                <h3 className="mb-2 h3">{step.title}</h3>
                <p className="body-m">{step.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section id="untuk-siapa" aria-labelledby="h-untuk">
        <Container className={`${sectionTop} py-22`}>
          <h2 id="h-untuk" className="display-2">
            Satu sistem, empat pihak
          </h2>
          <ul className="mt-10 grid list-none grid-cols-1 gap-x-14 p-0 nav:grid-cols-2">
            {AUDIENCES.map(({ title, text, Icon }) => (
              <li
                key={title}
                className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-line-soft py-7"
              >
                <Icon aria-hidden weight="duotone" className="size-8 text-biru-500" />
                <div>
                  <h3 className="mb-1.5 font-display text-[1.75rem] leading-tight font-normal text-fg-1">
                    {title}
                  </h3>
                  <p className="body-m">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section id="privasi" aria-labelledby="h-privasi">
        <Container className="py-24">
          <div className="grid grid-cols-1 items-center gap-12 rounded-2xl bg-raised p-7 shadow-md nav:grid-cols-[1fr_1.1fr] nav:p-14">
            <div>
              <h2 id="h-privasi" className="display-2">
                Kamu bisa lihat siapa yang membuka datamu.
              </h2>
              <ul className="mt-6 grid list-none gap-3.5 p-0">
                {PRIVACY_POINTS.map((point) => (
                  <li key={point} className="flex gap-3 text-fg-2">
                    <CheckCircle aria-hidden className="size-[1.375rem] shrink-0 text-sage-600" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6">
                <Link
                  href="/kebijakan-privasi"
                  className="font-semibold text-biru-600 underline underline-offset-4"
                >
                  Baca kebijakan privasi
                </Link>
              </p>
            </div>
            <AccessLogSample />
          </div>
        </Container>
      </section>

      <section id="developer" aria-labelledby="h-developer">
        <Container
          className={`${sectionTop} grid grid-cols-1 items-center gap-12 py-22 nav:grid-cols-[1fr_1.2fr]`}
        >
          <div>
            <h2 id="h-developer" className="display-2">
              Terbuka untuk sistem lain
            </h2>
            <p className="mt-4 lead">
              API publik berformat FHIR R4 untuk hasil skrining, lengkap dengan spesifikasi OpenAPI,
              supaya sistem lain bisa terhubung tanpa format khusus.
            </p>
            <Button href="/developers" variant="secondary" className="mt-7">
              Baca dokumentasi API
            </Button>
          </div>
          <ApiExample baseUrl={siteUrl()} />
        </Container>
      </section>
    </>
  );
}
