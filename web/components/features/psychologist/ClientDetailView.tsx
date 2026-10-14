import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/ssr';
import { ClientAssessmentSection } from '@/components/features/psychologist/ClientAssessmentSection';
import { ClientCompanionSection } from '@/components/features/psychologist/ClientCompanionSection';
import { ClientMoodSection } from '@/components/features/psychologist/ClientMoodSection';
import { ClientSleepSection } from '@/components/features/psychologist/ClientSleepSection';
import { NotSharedNotice } from '@/components/features/psychologist/NotSharedNotice';
import { SessionNoteForm } from '@/components/features/psychologist/SessionNoteForm';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ALERT_STATUS_LABEL, isAlertSeverity } from '@/lib/domain/psychologist/alerts';
import { summarizeMoods, summarizeSleep } from '@/lib/domain/psychologist/detail';
import { PERMISSION_LABEL, PSYCHOLOGIST_PERMISSION_KEYS } from '@/lib/domain/privacy/permissions';
import type { ClientDetail } from '@/lib/server/psychologist';
import { dateKeyWib, formatDateId, formatTimeId } from '@/lib/utils/date';

const CONSULTATION_STATUS: Readonly<Record<string, string>> = {
  pending: 'Menunggu konfirmasi',
  confirmed: 'Terkonfirmasi',
  ongoing: 'Sedang berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const SEVERITY_LABEL = { critical: 'Kritis', high: 'Tinggi' } as const;

/**
 * Isi halaman detail klien. Dipisah dari halaman supaya /dev/klien memakai tampilan yang sama persis.
 * Bagian yang tidak dibagikan klien (`null` pada detail) ditulis "tidak dibagikan", bukan dikosongkan.
 */
export function ClientDetailView({ detail, now }: { detail: ClientDetail; now: Date }) {
  const today = dateKeyWib(now);
  const { client } = detail;

  return (
    <>
      <section aria-labelledby="judul" className="pt-4 pb-6">
        <Link
          href="/psikolog/klien"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-biru-600 no-underline hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Semua klien
        </Link>
        <div className="flex items-center gap-4">
          <Avatar name={client.name} tone="biru" />
          <div>
            <h1 id="judul" className="display-3">
              {client.name}
            </h1>
            <p className="mt-1 body-m">
              Terhubung sejak{' '}
              {formatDateId(new Date(client.linkedAt), {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <ul aria-label="Data yang dibagikan klien" className="mt-4 flex flex-wrap gap-2">
          {PSYCHOLOGIST_PERMISSION_KEYS.map((key) => (
            <li key={key}>
              <Badge tone={client.permissions[key] ? 'sage' : 'neutral'}>
                {PERMISSION_LABEL[key]}
                <span className="sr-only">
                  {client.permissions[key] ? ': dibagikan' : ': tidak dibagikan'}
                </span>
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid items-start gap-5 wide:grid-cols-2">
        <Card as="section" aria-labelledby="h-skrining">
          <CardHeader title="Skrining" titleId="h-skrining" />
          {detail.assessments === null ? (
            <NotSharedNotice what="hasil skrining" />
          ) : (
            <ClientAssessmentSection rows={detail.assessments} />
          )}
        </Card>

        <Card as="section" aria-labelledby="h-mood">
          <CardHeader title="Mood 14 hari" titleId="h-mood" />
          {detail.moods === null ? (
            <NotSharedNotice what="mood harian" />
          ) : (
            <ClientMoodSection overview={summarizeMoods(detail.moods, today)} />
          )}
        </Card>

        <Card as="section" aria-labelledby="h-tidur">
          <CardHeader title="Tidur 14 hari" titleId="h-tidur" />
          {detail.sleeps === null ? (
            <NotSharedNotice what="catatan tidur" />
          ) : (
            <ClientSleepSection overview={summarizeSleep(detail.sleeps, today)} />
          )}
        </Card>

        <Card as="section" aria-labelledby="h-krisis">
          <CardHeader title="Peringatan krisis" titleId="h-krisis" />
          {detail.alerts === null ? (
            <NotSharedNotice what="peringatan krisis" />
          ) : detail.alerts.length === 0 ? (
            <p className="body-m">Belum ada peringatan krisis untuk klien ini.</p>
          ) : (
            <ul className="grid">
              {detail.alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft py-3 first:border-t-0 first:pt-0"
                >
                  <Badge tone={alert.status === 'open' ? 'severe' : 'neutral'}>
                    {isAlertSeverity(alert.severity)
                      ? SEVERITY_LABEL[alert.severity]
                      : 'Peringatan'}
                  </Badge>
                  <span className="text-sm text-fg-2">
                    {ALERT_STATUS_LABEL[alert.status] ?? alert.status}
                  </span>
                  <time dateTime={alert.createdAt} className="ml-auto meta">
                    {formatDateId(new Date(alert.createdAt), { day: 'numeric', month: 'long' })},{' '}
                    {formatTimeId(alert.createdAt)} WIB
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card as="section" aria-labelledby="h-teman">
          <CardHeader title="Teman cerita" titleId="h-teman" />
          {detail.companion === null ? (
            <NotSharedNotice what="ringkasan penggunaan Teman cerita" />
          ) : (
            <ClientCompanionSection activity={detail.companion} />
          )}
        </Card>
      </div>

      <section aria-labelledby="h-sesi" className="mt-8">
        <h2 id="h-sesi" className="mb-4 h2">
          Catatan sesi
        </h2>
        {detail.consultations.length === 0 ? (
          <EmptyState
            title="Belum ada sesi dengan klien ini"
            description="Catatan sesi bisa kamu tulis setelah ada sesi terjadwal."
            headingLevel="h3"
          />
        ) : (
          <ol className="grid gap-5">
            {detail.consultations.map((consultation) => (
              <li key={consultation.id}>
                <Card as="article" aria-labelledby={`sesi-${consultation.id}`}>
                  <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 id={`sesi-${consultation.id}`} className="h3">
                      {formatDateId(new Date(consultation.scheduledAt), {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      , {formatTimeId(consultation.scheduledAt)} WIB
                    </h3>
                    <Badge>{CONSULTATION_STATUS[consultation.status] ?? consultation.status}</Badge>
                  </header>
                  <SessionNoteForm
                    consultationId={consultation.id}
                    summary={consultation.summary}
                    notesForPatient={consultation.notesForPatient}
                  />
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="mt-6 meta">
        Data klien yang kamu buka di halaman ini tercatat dan dapat dilihat oleh klien.
      </p>
    </>
  );
}
