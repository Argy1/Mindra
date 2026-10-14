import { AnonymityNotice } from '@/components/features/faskes/AnonymityNotice';
import { FacilitySwitcher } from '@/components/features/faskes/FacilitySwitcher';
import { FaskesMap } from '@/components/features/faskes/FaskesMap';
import { PeriodNav } from '@/components/features/faskes/PeriodNav';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { PERIODS, type PeriodKey } from '@/lib/domain/faskes/dashboard';
import { PHQ_BAND_LABEL, type MapModel, type PhqBand } from '@/lib/domain/faskes/map';
import type { ManagedFacility } from '@/lib/server/faskes-dashboard';
import { cn } from '@/lib/utils/cn';
import { formatDecimalId } from '@/lib/utils/date';

const BANDS: readonly { band: PhqBand; swatch: string }[] = [
  { band: 'minimal', swatch: 'bg-success-500' },
  { band: 'mild', swatch: 'bg-info-500' },
  { band: 'moderate', swatch: 'bg-warning-500' },
  { band: 'severe', swatch: 'bg-danger-500' },
];

const TYPE_LABEL: Readonly<Record<string, string>> = {
  puskesmas: 'Puskesmas',
  rumah_sakit: 'Rumah sakit',
  klinik: 'Klinik',
  biro_psikologi: 'Biro psikologi',
};

const head = 'px-2.5 pb-2 text-left text-xs font-semibold text-fg-4';
const cell = 'border-t border-line-soft px-2.5 py-2.5 align-top';

interface FaskesMapViewProps {
  facility: ManagedFacility;
  facilities: readonly ManagedFacility[];
  period: PeriodKey;
  model: MapModel;
  basePath?: string;
}

/**
 * Halaman "Peta layanan". Peta (Leaflet) hanya tampilan tambahan; tabel di bawahnya memuat angka yang sama
 * dan daftar faskes, jadi tidak ada informasi yang hanya bisa didapat lewat peta.
 */
export function FaskesMapView({
  facility,
  facilities,
  period,
  model,
  basePath = '/faskes/peta',
}: FaskesMapViewProps) {
  const periodLabel = PERIODS.find((entry) => entry.key === period)!.label;
  const switchable = facilities.length > 1;
  const pinsByCity = [...model.pins].sort(
    (a, b) => a.city.localeCompare(b.city, 'id') || a.name.localeCompare(b.name, 'id'),
  );

  return (
    <>
      <section
        aria-labelledby="judul"
        className="flex flex-wrap items-end justify-between gap-4 pt-4 pb-5"
      >
        <div>
          <h1 id="judul" className="display-3">
            Peta layanan di {facility.province}
          </h1>
          <p className="mt-1 body-m">
            Sebaran rata-rata skor per kota dan faskes di sekitarnya · {periodLabel} terakhir
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

      <Card as="section" aria-labelledby="h-peta" className="mb-5">
        <CardHeader title="Sebaran per kota" titleId="h-peta" />
        <FaskesMap
          model={model}
          label="Peta interaktif sebaran rata-rata PHQ-9 per kota dan titik faskes. Angka yang sama tersedia di tabel di bawah peta."
        />
        <ul
          className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-fg-3"
          aria-label="Keterangan peta"
        >
          {BANDS.map(({ band, swatch }) => (
            <li key={band} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={cn('size-3 rounded-full', swatch)} />
              {PHQ_BAND_LABEL[band]}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-full border-2 border-dashed border-fg-3" />
            Disembunyikan (kurang dari 10 pengguna)
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-full bg-matahari-500" />
            Faskemu
          </li>
        </ul>
        <p className="mt-2 meta">
          Ukuran gelembung mengikuti jumlah pengguna aktif per pekan. Posisi kota adalah titik
          tengah faskes di kota itu, bukan lokasi pengguna.
        </p>
      </Card>

      <Card as="section" aria-labelledby="h-data" className="mb-5">
        <CardHeader title="Angka per kota" titleId="h-data" />
        <div
          role="group"
          aria-label="Tabel angka per kota"
          tabIndex={0}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">
              Rata-rata PHQ-9 dan pengguna aktif per kota, hanya dari kelompok minimal 10 orang
            </caption>
            <thead>
              <tr>
                {['Kota', 'Rata-rata PHQ-9', 'Pengguna aktif per pekan', 'Faskes di kota'].map(
                  (heading) => (
                    <th key={heading} scope="col" className={head}>
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {model.bubbles.map((bubble) => (
                <tr key={bubble.city}>
                  <th scope="row" className={cn(cell, 'text-left font-medium text-fg-1')}>
                    {bubble.city}
                    {bubble.isOwn ? <span className="ml-1.5 text-fg-3">(kotamu)</span> : null}
                  </th>
                  <td className={cn(cell, 'num')}>
                    {bubble.avgPhq9 === null ? (
                      <span className="text-fg-3">Disembunyikan (kurang dari 10 pengguna)</span>
                    ) : (
                      formatDecimalId(bubble.avgPhq9)
                    )}
                  </td>
                  <td className={cn(cell, 'num')}>{bubble.avgActiveUsers ?? '–'}</td>
                  <td className={cn(cell, 'num')}>
                    {bubble.facilityCount > 0 ? bubble.facilityCount : 'tidak ada koordinat'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card as="section" aria-labelledby="h-faskes">
        <CardHeader title="Faskes di provinsi ini" titleId="h-faskes" />
        {pinsByCity.length === 0 ? (
          <p className="body-m">Belum ada faskes berkoordinat untuk provinsi ini.</p>
        ) : (
          <div role="group" aria-label="Daftar faskes" tabIndex={0} className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <caption className="sr-only">Daftar faskes di provinsi ini</caption>
              <thead>
                <tr>
                  {['Nama', 'Jenis', 'Kota'].map((heading) => (
                    <th key={heading} scope="col" className={head}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pinsByCity.map((pin) => (
                  <tr key={pin.id}>
                    <th scope="row" className={cn(cell, 'text-left font-medium text-fg-1')}>
                      {pin.name}
                      {pin.isOwn ? <span className="ml-1.5 text-fg-3">(faskesmu)</span> : null}
                    </th>
                    <td className={cell}>{TYPE_LABEL[pin.type] ?? pin.type}</td>
                    <td className={cell}>{pin.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
