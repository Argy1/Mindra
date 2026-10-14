import Link from 'next/link';
import { DownloadSimple } from '@phosphor-icons/react/ssr';
import { AnonymityNotice } from '@/components/features/faskes/AnonymityNotice';
import { FacilitySwitcher } from '@/components/features/faskes/FacilitySwitcher';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { monthLabel, type ReportRow } from '@/lib/domain/faskes/report';
import type { ManagedFacility } from '@/lib/server/faskes-dashboard';
import { cn } from '@/lib/utils/cn';
import { formatDecimalId } from '@/lib/utils/date';

const head = 'px-2.5 pb-2 text-left text-xs font-semibold text-fg-4';
const cell = 'border-t border-line-soft px-2.5 py-2.5 align-top num';
const dash = '–';

const number = (value: number | null, digits = 0) =>
  value === null ? dash : digits > 0 ? formatDecimalId(value, digits) : String(value);

interface ReportViewProps {
  facility: ManagedFacility;
  facilities: readonly ManagedFacility[];
  months: readonly string[];
  month: string;
  rows: readonly ReportRow[];
  basePath?: string;
  downloadPath?: string;
}

/** Halaman "Laporan bulanan": pilih bulan, lihat tabel anonim, unduh CSV (dibangun dari agregat yang sama). */
export function ReportView({
  facility,
  facilities,
  months,
  month,
  rows,
  basePath = '/faskes/laporan',
  downloadPath = '/faskes/unduh/laporan',
}: ReportViewProps) {
  const switchable = facilities.length > 1;
  const facilityQuery = switchable ? `&faskes=${facility.id}` : '';
  const shown = rows.filter((row) => !row.hidden);

  return (
    <>
      <section
        aria-labelledby="judul"
        className="flex flex-wrap items-end justify-between gap-4 pt-4 pb-5"
      >
        <div>
          <h1 id="judul" className="display-3">
            Laporan bulanan
          </h1>
          <p className="mt-1 body-m">
            {facility.name} · gabungan anonim per kota di {facility.province}
          </p>
        </div>
        {rows.length > 0 ? (
          <a
            href={`${downloadPath}?bulan=${month}${facilityQuery}`}
            className="touch-target inline-flex min-h-11 items-center gap-2 rounded-pill border border-line-medium bg-raised px-4 text-sm font-semibold text-biru-700 no-underline transition-colors duration-(--dur-fast) hover:border-biru-300"
          >
            <DownloadSimple aria-hidden className="size-5" />
            Unduh CSV
            <span className="sr-only"> laporan {monthLabel(month)}</span>
          </a>
        ) : null}
      </section>

      <FacilitySwitcher
        facilities={facilities}
        currentId={facility.id}
        basePath={basePath}
        extraQuery={`bulan=${month}`}
      />

      <nav aria-label="Bulan" className="mb-4 flex flex-wrap gap-2">
        {months.map((option) => (
          <Link
            key={option}
            href={`${basePath}?bulan=${option}${facilityQuery}`}
            aria-current={option === month ? 'true' : undefined}
            className={cn(
              'touch-target inline-flex min-h-9 items-center rounded-pill border border-line-soft bg-raised px-3.5',
              'text-sm font-medium text-fg-2 no-underline transition-colors duration-(--dur-fast) hover:border-biru-200',
              'aria-[current=true]:border-biru-300 aria-[current=true]:bg-biru-50 aria-[current=true]:text-biru-700',
            )}
          >
            {monthLabel(option)}
          </Link>
        ))}
      </nav>

      <AnonymityNotice />

      <Card as="section" aria-labelledby="h-laporan">
        <CardHeader
          title={`Ringkasan ${monthLabel(month)}`}
          titleId="h-laporan"
          action={<span className="meta">{shown.length} kota tampil</span>}
        />
        {rows.length === 0 ? (
          <EmptyState
            headingLevel="h3"
            title="Belum ada data di bulan ini"
            description="Laporan terisi bila ada kota dengan minimal 10 pengguna aktif dalam satu pekan. Pilih bulan lain."
          />
        ) : (
          <>
            <div
              role="group"
              aria-label="Tabel laporan bulanan"
              tabIndex={0}
              className="overflow-x-auto"
            >
              <table className="w-full min-w-[46rem] border-collapse text-sm">
                <caption className="sr-only">Laporan {monthLabel(month)} per kota</caption>
                <thead>
                  <tr>
                    {[
                      'Kota',
                      'Pekan tampil',
                      'Pengguna aktif per pekan',
                      'PHQ-9',
                      'GAD-7',
                      'PSS-10',
                      'Minimal',
                      'Ringan',
                      'Sedang',
                      'Berat',
                      'Peringatan krisis',
                    ].map((heading) => (
                      <th key={heading} scope="col" className={head}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) =>
                    row.hidden ? (
                      <tr key={row.city}>
                        <th scope="row" className={cn(cell, 'text-left font-medium text-fg-3')}>
                          {row.city}
                        </th>
                        <td
                          colSpan={10}
                          className="border-t border-line-soft px-2.5 py-2.5 text-fg-3"
                        >
                          Disembunyikan (kurang dari 10 pengguna)
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.city}>
                        <th scope="row" className={cn(cell, 'text-left font-medium text-fg-1')}>
                          {row.city}
                        </th>
                        <td className={cell}>{row.weeksShown}</td>
                        <td className={cell}>{number(row.avgActiveUsers)}</td>
                        <td className={cell}>{number(row.avgPhq9, 1)}</td>
                        <td className={cell}>{number(row.avgGad7, 1)}</td>
                        <td className={cell}>{number(row.avgPss10, 1)}</td>
                        <td className={cell}>{number(row.minimal)}</td>
                        <td className={cell}>{number(row.mild)}</td>
                        <td className={cell}>{number(row.moderate)}</td>
                        <td className={cell}>{number(row.severe)}</td>
                        <td className={cell}>{number(row.crisisAlerts)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 meta">
              Satu pekan dihitung pada bulan tempat pekan itu dimulai (Senin). Rata-rata skor
              ditimbang dengan pengguna aktif tiap pekan; jumlah skrining dan peringatan
              dijumlahkan.
            </p>
          </>
        )}
      </Card>
    </>
  );
}
