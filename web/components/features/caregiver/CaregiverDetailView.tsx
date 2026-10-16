import Link from 'next/link';
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react/ssr';
import { MoodDots } from '@/components/features/psychologist/MoodDots';
import { NotSharedNotice } from '@/components/features/psychologist/NotSharedNotice';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { CrisisBanner } from '@/components/ui/CrisisBanner';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import { INSTRUMENTS } from '@/lib/domain/assessment/instruments';
import type { MoodTrend } from '@/lib/domain/insight/engine';
import type { CaregiverPatientDetail } from '@/lib/server/caregiver';
import { formatDateId } from '@/lib/utils/date';

const TREND_TEXT: Readonly<Record<MoodTrend, string>> = {
  rising: 'Perasaannya cenderung membaik minggu ini.',
  falling: 'Perasaannya cenderung menurun minggu ini.',
  stable: 'Perasaannya cenderung stabil minggu ini.',
  insufficient: 'Belum cukup catatan untuk melihat arahnya.',
};

/**
 * Isi halaman satu orang yang didampingi. Tiap bagian hanya tampil bila izinnya menyala; bagian lain
 * menjelaskan bahwa orang itu memilih tidak membagikannya. Dipisah dari halaman untuk /dev/pendamping.
 */
export function CaregiverDetailView({ detail }: { detail: CaregiverPatientDetail }) {
  const { patient, view } = detail;
  const owner = patient.name;
  const hasOpenAlert = view.alerts.allowed && view.alerts.open.length > 0;

  return (
    <>
      <section aria-labelledby="judul" className="pt-4 pb-6">
        <Link
          href="/pendamping"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-biru-600 no-underline hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Kembali
        </Link>
        <div className="flex items-center gap-4">
          <Avatar name={patient.name} tone="sage" />
          <div>
            <h1 id="judul" className="display-3">
              {patient.name}
            </h1>
            <p className="mt-1 body-m">
              Kamu melihat hal yang diizinkan, dan setiap kali kamu membukanya tercatat untuknya.
            </p>
          </div>
        </div>
      </section>

      {hasOpenAlert ? (
        <div className="mb-5">
          <CrisisBanner
            title={`Ada peringatan darurat untuk ${patient.name}`}
            footnote="Bila ada bahaya langsung, hubungi layanan darurat setempat."
          >
            <p className="body-m text-danger-900">
              Hubungi {patient.name} sekarang dan tanyakan kabarnya dengan tenang. Tetap bersamanya
              bila bisa, dan ajak mencari bantuan profesional.
            </p>
            {/* Tombol banner menelepon layanan krisis, BUKAN orang yang didampingi: dijelaskan supaya tidak salah paham. */}
            <p className="mt-2 body-m text-danger-900">
              Tombol di bawah menelepon {PRIMARY_CRISIS_RESOURCE.name} (
              {PRIMARY_CRISIS_RESOURCE.displayNumber}) untuk meminta saran, bukan menghubungi{' '}
              {patient.name}.
            </p>
          </CrisisBanner>
        </div>
      ) : null}

      <div className="grid items-start gap-5 wide:grid-cols-2">
        <Card as="section" aria-labelledby="h-mood">
          <CardHeader title="Mood 7 hari" titleId="h-mood" />
          {!view.mood.allowed ? (
            <NotSharedNotice what="mood harian" owner={owner} />
          ) : (
            <div className="grid gap-3">
              <MoodDots days={view.mood.days} label={`Mood ${owner} 7 hari terakhir`} />
              <p className="body-m">
                Check-in {view.mood.checkInDays} dari 7 hari. {TREND_TEXT[view.mood.trend]}
              </p>
              {view.mood.lowRecently ? (
                <p className="rounded-lg bg-sunken px-4 py-3 body-m">
                  Beberapa hari terakhir perasaannya terasa berat. Menanyakan kabar dengan hangat,
                  tanpa menghakimi, bisa sangat berarti.
                </p>
              ) : null}
            </div>
          )}
        </Card>

        <Card as="section" aria-labelledby="h-skrining">
          <CardHeader title="Hasil skrining terakhir" titleId="h-skrining" />
          {!view.assessment.allowed ? (
            <NotSharedNotice what="hasil skrining" owner={owner} />
          ) : view.assessment.latest ? (
            <div className="grid gap-3">
              <p className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-fg-1">
                  {INSTRUMENTS[view.assessment.latest.type].name}
                </span>
                <CategoryBadge category={view.assessment.latest.category} />
                <time dateTime={view.assessment.latest.completedAt} className="meta">
                  {formatDateId(new Date(view.assessment.latest.completedAt), {
                    day: 'numeric',
                    month: 'long',
                  })}
                </time>
              </p>
              <p className="meta">
                Hanya kategorinya yang ditampilkan, tanpa skor. Ini skrining, bukan diagnosis.
              </p>
            </div>
          ) : (
            <p className="body-m">Belum ada skrining yang diisi.</p>
          )}
        </Card>

        <Card as="section" aria-labelledby="h-darurat" className="wide:col-span-2">
          <CardHeader title="Peringatan darurat" titleId="h-darurat" />
          {!view.alerts.allowed ? (
            <NotSharedNotice what="peringatan darurat" owner={owner} />
          ) : view.alerts.open.length === 0 ? (
            <p className="flex items-center gap-3 body-m">
              <CheckCircle aria-hidden weight="duotone" className="size-6 shrink-0 text-sage-600" />
              Tidak ada peringatan darurat yang terbuka.
            </p>
          ) : (
            <p className="body-m">
              {view.alerts.open.length} peringatan terbuka. Lihat saran di bagian atas halaman.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
