import type { ReactNode } from 'react';
import { Eye } from '@phosphor-icons/react/ssr';
import { ClientTable } from '@/components/features/psychologist/ClientTable';
import { TodaySessions } from '@/components/features/psychologist/TodaySessions';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import type { ClientFilter } from '@/lib/domain/psychologist/summary';
import type { DashboardData } from '@/lib/server/psychologist';
import { formatDateId, greetingForHour, hourWib } from '@/lib/utils/date';

interface DashboardViewProps {
  data: DashboardData;
  /** Nama panggilan psikolog (kata pertama nama profil). */
  name: string;
  filter: ClientFilter;
  now: Date;
  /** Panel peringatan krisis realtime; di halaman pratinjau diganti versi dengan klien palsu. */
  livePanel: ReactNode;
  /** Tujuan tautan filter tabel klien. Bawaannya halaman dasbor itu sendiri. */
  basePath?: string;
}

/**
 * Isi dasbor psikolog (design/psikolog-dashboard.html). Dipisah dari halaman supaya /dev/psikolog
 * memakai tampilan yang sama persis dengan /psikolog.
 */
export function DashboardView({
  data,
  name,
  filter,
  now,
  livePanel,
  basePath = '/psikolog',
}: DashboardViewProps) {
  const greeting = `Selamat ${greetingForHour(hourWib(now))}`;
  const stats = [
    { label: 'klien aktif', value: data.stats.activeClients },
    { label: 'peringatan terbuka', value: data.stats.openAlerts },
    { label: 'skrining baru minggu ini', value: data.stats.newAssessmentsThisWeek },
    { label: 'skor memburuk', value: data.stats.worsened },
  ];

  return (
    <>
      <section aria-labelledby="sapa" className="pt-4 pb-6">
        <h1 id="sapa" className="display-3">
          {name ? `${greeting}, ${name}.` : `${greeting}.`}
        </h1>
        <p className="mt-1 body-m">
          {formatDateId(now)} · {data.sessionsToday.length} sesi hari ini
        </p>
      </section>

      {livePanel}

      <dl className="my-5 grid grid-cols-2 gap-4 wide:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col-reverse rounded-lg bg-raised px-5 py-4 shadow-xs"
          >
            <dt className="text-sm text-fg-3">{stat.label}</dt>
            <dd className="font-display text-[2.5rem] leading-[1.1] text-fg-1 num">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 items-start gap-5 min-[90rem]:grid-cols-[minmax(0,1fr)_17.5rem]">
        <Card as="section" aria-labelledby="h-klien">
          <CardHeader title="Klien" titleId="h-klien" />
          <ClientTable summaries={data.summaries} filter={filter} basePath={basePath} />
        </Card>
        <TodaySessions sessions={data.sessionsToday} now={now} />
      </div>

      <p className="mt-5 inline-flex items-center gap-2 meta">
        <Eye aria-hidden className="size-4" />
        Setiap data klien yang kamu buka tercatat dan dapat dilihat oleh klien yang bersangkutan.
      </p>
    </>
  );
}
