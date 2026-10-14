import Link from 'next/link';
import { Lightbulb, PlugsConnected } from '@phosphor-icons/react/ssr';
import { AnonymityNotice } from '@/components/features/faskes/AnonymityNotice';
import { CategoryDistribution } from '@/components/features/faskes/CategoryDistribution';
import { CityComparison } from '@/components/features/faskes/CityComparison';
import { FacilitySwitcher } from '@/components/features/faskes/FacilitySwitcher';
import { PeriodNav } from '@/components/features/faskes/PeriodNav';
import { StatCards } from '@/components/features/faskes/StatCards';
import { TrendChart } from '@/components/features/faskes/TrendChart';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  PERIODS,
  weekRangeLabel,
  type DashboardView,
  type PeriodKey,
} from '@/lib/domain/faskes/dashboard';
import type { ManagedFacility } from '@/lib/server/faskes-dashboard';

interface FaskesDashboardViewProps {
  facility: ManagedFacility;
  facilities: readonly ManagedFacility[];
  period: PeriodKey;
  view: DashboardView;
  /** Jumlah kunci API aktif milik admin; null bila tidak tersedia (mis. halaman pratinjau). */
  activeKeyCount: number | null;
  basePath?: string;
}

/**
 * Isi dasbor "Tren wilayah" (design/faskes-dashboard.html). Dipisah dari halaman supaya /dev/faskes
 * memakai tampilan yang sama persis dengan /faskes. Komponen ini hanya menerima angka gabungan.
 */
export function FaskesDashboardView({
  facility,
  facilities,
  period,
  view,
  activeKeyCount,
  basePath = '/faskes',
}: FaskesDashboardViewProps) {
  const periodLabel = PERIODS.find((entry) => entry.key === period)!.label;
  const scopeName = view.scope.kind === 'city' ? view.scope.city : view.scope.province;
  const switchable = facilities.length > 1;

  return (
    <>
      <section
        aria-labelledby="judul"
        className="flex flex-wrap items-end justify-between gap-4 pt-4 pb-5"
      >
        <div>
          <h1 id="judul" className="display-3">
            Kesehatan mental warga {scopeName}
          </h1>
          <p className="mt-1 body-m">
            {facility.name} · {periodLabel} terakhir
            {view.summary.weekStart
              ? `, ringkasan memakai pekan ${weekRangeLabel(view.summary.weekStart)}`
              : ''}
          </p>
        </div>
        <PeriodNav
          basePath={basePath}
          period={period}
          facilityId={switchable ? facility.id : undefined}
        />
      </section>

      <FacilitySwitcher
        facilities={facilities}
        currentId={facility.id}
        basePath={basePath}
        extraQuery={`periode=${period}`}
      />

      <AnonymityNotice />

      {view.scope.kind === 'province' && !view.empty ? (
        <p className="mb-5 rounded-md bg-sunken px-4 py-3 text-sm text-fg-2">
          Kota {facility.city} belum punya cukup pengguna aktif (minimal 10 orang dalam satu pekan),
          jadi angka di bawah adalah gabungan kota lain di {facility.province} yang datanya tampil.
        </p>
      ) : null}

      <StatCards summary={view.summary} />

      <div className="grid grid-cols-1 items-start gap-5 min-[68.8125rem]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card as="section" aria-labelledby="h-tren" hero>
          <CardHeader title="Rata-rata skor per pekan" titleId="h-tren" />
          {view.empty ? (
            <EmptyState
              headingLevel="h3"
              title="Belum ada angka yang bisa ditampilkan"
              description="Angka baru muncul bila minimal 10 orang aktif di satu kota pada pekan yang sama. Coba periode yang lebih panjang."
            />
          ) : (
            <TrendChart weeks={view.weeks} />
          )}
          {view.note ? (
            <p className="mt-4 flex gap-3 rounded-md bg-matahari-50 px-4 py-3.5 text-sm text-matahari-800">
              <Lightbulb aria-hidden weight="duotone" className="size-[1.375rem] flex-none" />
              <span>
                {view.note}{' '}
                <span className="text-matahari-800/80">
                  Catatan ini dibuat otomatis dari angka di halaman ini.
                </span>
              </span>
            </p>
          ) : null}
        </Card>

        <div className="grid gap-5">
          <Card as="section" aria-labelledby="h-kota">
            <CardHeader
              title="Dibanding kota lain"
              titleId="h-kota"
              action={<span className="meta">PHQ-9 rata-rata</span>}
            />
            {view.cities.length > 0 ? (
              <CityComparison cities={view.cities} />
            ) : (
              <p className="body-m">Belum ada kota lain yang aktif pada periode ini.</p>
            )}
          </Card>

          <Card as="section" aria-labelledby="h-sebaran">
            <CardHeader title="Sebaran kategori per kota" titleId="h-sebaran" />
            {view.distribution.length > 0 ? (
              <CategoryDistribution distribution={view.distribution} />
            ) : (
              <p className="body-m">Belum ada skrining yang bisa ditampilkan.</p>
            )}
          </Card>

          <Card as="section" aria-labelledby="h-api" variant="sunken">
            <div className="flex items-center gap-3.5">
              <PlugsConnected
                aria-hidden
                weight="duotone"
                className="size-8 flex-none text-biru-500"
              />
              <div>
                <h2 id="h-api" className="h3">
                  Sambungkan ke SIMRS atau SIMPUS
                </h2>
                <p className="body-m">
                  Tarik angka yang sama lewat API.{' '}
                  {activeKeyCount === null
                    ? null
                    : activeKeyCount > 0
                      ? `Kamu punya ${activeKeyCount} kunci aktif. `
                      : 'Kamu belum punya kunci aktif. '}
                  <Link href="/faskes/kunci-api" className="font-semibold">
                    Kelola kunci API
                  </Link>
                  {' · '}
                  <Link href="/developers" className="font-semibold">
                    Dokumentasi
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
