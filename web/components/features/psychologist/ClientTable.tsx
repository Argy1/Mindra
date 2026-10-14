import Link from 'next/link';
import { Users } from '@phosphor-icons/react/ssr';
import { MoodDots } from '@/components/features/psychologist/MoodDots';
import { TrendLine } from '@/components/features/psychologist/TrendLine';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { INSTRUMENTS } from '@/lib/domain/assessment/instruments';
import {
  CLIENT_FILTERS,
  filterClients,
  type ClientFilter,
  type ClientSummary,
} from '@/lib/domain/psychologist/summary';
import { formatShortDayId } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

const FILTER_LABEL: Readonly<Record<ClientFilter, string>> = {
  semua: 'Semua',
  memburuk: 'Skor memburuk',
  'belum-checkin': 'Belum check-in 3 hari',
};

const EMPTY_FILTER_MESSAGE: Readonly<Record<ClientFilter, string>> = {
  semua: '',
  memburuk: 'Tidak ada klien dengan skor yang memburuk. Itu kabar baik.',
  'belum-checkin': 'Semua klien yang membagikan mood sudah check-in dalam 3 hari terakhir.',
};

interface ClientTableProps {
  summaries: readonly ClientSummary[];
  filter: ClientFilter;
  /** Halaman tempat tabel ini berada; tautan filter mengarah ke sini (`?filter=`). */
  basePath: string;
}

const filterHref = (basePath: string, filter: ClientFilter) =>
  filter === 'semua' ? basePath : `${basePath}?filter=${filter}`;

const cell = 'border-t border-line-soft px-2.5 py-3.5 align-middle';
const head = 'px-2.5 pb-2 text-left text-xs font-semibold text-fg-4';

function NotShared() {
  return <span className="text-sm text-fg-4">Tidak dibagikan</span>;
}

/**
 * Tabel klien (design/psikolog-dashboard.html). Filter berupa tautan (`?filter=`), bukan state klien,
 * jadi hasilnya bisa dibagikan, tombol kembali bekerja, dan halaman tetap Server Component.
 * Data yang tidak dibagikan klien ditulis "Tidak dibagikan", tidak pernah dikosongkan diam-diam.
 */
export function ClientTable({ summaries, filter, basePath }: ClientTableProps) {
  const rows = filterClients(summaries, filter);

  return (
    <div>
      <nav aria-label="Filter klien" className="mb-4 flex flex-wrap gap-2">
        {CLIENT_FILTERS.map((option) => (
          <Link
            key={option}
            href={filterHref(basePath, option)}
            aria-current={option === filter ? 'true' : undefined}
            className={cn(
              'touch-target inline-flex min-h-9 items-center rounded-pill border border-line-soft bg-raised px-3.5',
              'text-sm font-medium text-fg-2 no-underline transition-colors duration-(--dur-fast) hover:border-biru-200',
              'aria-[current=true]:border-biru-300 aria-[current=true]:bg-biru-50 aria-[current=true]:text-biru-700',
            )}
          >
            {FILTER_LABEL[option]}
          </Link>
        ))}
      </nav>

      {summaries.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Belum ada klien terhubung"
          description="Klien muncul di sini setelah mereka menghubungkanmu lewat halaman Privasi dan izin di Mindra."
          headingLevel="h3"
        />
      ) : rows.length === 0 ? (
        <p className="rounded-lg bg-sunken px-5 py-6 text-center body-m">
          {EMPTY_FILTER_MESSAGE[filter]}
        </p>
      ) : (
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="sr-only">
              Daftar klien dengan skrining terakhir, tren skor, mood 7 hari, dan sesi berikutnya
            </caption>
            <thead>
              <tr>
                <th scope="col" className={head}>
                  Klien
                </th>
                <th scope="col" className={head}>
                  Skrining terakhir
                </th>
                <th scope="col" className={head}>
                  Tren
                </th>
                <th scope="col" className={head}>
                  Mood 7 hari
                </th>
                <th scope="col" className={head}>
                  Sesi berikutnya
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((summary) => (
                <ClientRow key={summary.patientId} summary={summary} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ClientRow({ summary }: { summary: ClientSummary }) {
  const { assessment, mood } = summary;
  const instrument =
    assessment.shared && assessment.latest ? INSTRUMENTS[assessment.latest.type].name : null;

  return (
    <tr>
      <th scope="row" className={cn(cell, 'text-left font-normal')}>
        <div className="flex items-center gap-2.5">
          <Avatar name={summary.name} size="sm" tone="biru" />
          <div className="min-w-32">
            <Link
              href={`/psikolog/klien/${summary.patientId}`}
              className="block font-semibold text-fg-1 no-underline hover:underline"
            >
              {summary.name}
            </Link>
            {instrument ? <span className="meta">{instrument}</span> : null}
          </div>
        </div>
      </th>
      <td className={cell}>
        {!assessment.shared ? (
          <NotShared />
        ) : assessment.latest ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-bold text-fg-1 num">{assessment.latest.score}</span>
            <CategoryBadge category={assessment.latest.category} />
          </span>
        ) : (
          <span className="text-sm text-fg-4">Belum ada</span>
        )}
      </td>
      <td className={cell}>
        {assessment.shared && instrument ? (
          <TrendLine scores={assessment.scores} trend={assessment.trend} instrument={instrument} />
        ) : (
          <span className="text-sm text-fg-4">
            –<span className="sr-only"> Tidak ada tren</span>
          </span>
        )}
      </td>
      <td className={cell}>
        {!mood.shared ? (
          <NotShared />
        ) : (
          <div className="grid gap-1.5">
            <MoodDots days={mood.days} />
            {mood.missedCheckIn ? <span className="meta">Belum check-in 3 hari</span> : null}
          </div>
        )}
      </td>
      <td className={cell}>
        {summary.nextSession ? (
          formatShortDayId(summary.nextSession)
        ) : (
          <span className="text-fg-4">Belum ada</span>
        )}
      </td>
    </tr>
  );
}
