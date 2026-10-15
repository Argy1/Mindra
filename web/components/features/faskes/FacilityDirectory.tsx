'use client';

import { useId, useMemo, useState } from 'react';
import { ArrowSquareOut, MapPin, MapPinSimple, Phone } from '@phosphor-icons/react/ssr';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import {
  FACILITY_TYPE_LABEL,
  arrangeFacilities,
  filterFacilities,
  formatDistance,
  isValidCoordinates,
  openStreetMapLink,
  provincesOf,
  telHrefOf,
  type Coordinates,
  type DirectoryFacility,
} from '@/lib/domain/faskes/nearest';

const PAGE_SIZE = 20;

type Locating =
  | { state: 'idle' }
  | { state: 'locating' }
  | { state: 'ready'; origin: Coordinates }
  | { state: 'failed'; message: string };

const FAILURE: Readonly<Record<number, string>> = {
  1: 'Izin lokasi ditolak. Kamu masih bisa memilih provinsi atau mencari nama kota.',
  2: 'Lokasimu belum bisa ditentukan sekarang. Coba lagi, atau pilih provinsi.',
  3: 'Menentukan lokasi terlalu lama. Coba lagi, atau pilih provinsi.',
};

interface FacilityDirectoryProps {
  facilities: readonly DirectoryFacility[];
  /** Isi direktori sudah dikurasi dari sumber resmi. Bila belum, tampil catatan bahwa daftar ini contoh. */
  verified: boolean;
  /** Pembaca data gagal: tampilkan pesan, bukan daftar kosong yang menyesatkan. */
  loadFailed?: boolean;
}

/**
 * Daftar layanan kesehatan jiwa. Menyaring dan mengurutkan di peramban. Lokasi pengguna (bila diizinkan) hanya dipakai
 * untuk menghitung jarak di perangkat ini: tidak dikirim ke server, tidak disimpan, dan tidak ada di tautan peta.
 */
export function FacilityDirectory({
  facilities,
  verified,
  loadFailed = false,
}: FacilityDirectoryProps) {
  const [province, setProvince] = useState('');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [locating, setLocating] = useState<Locating>({ state: 'idle' });
  const noteId = useId();

  const origin = locating.state === 'ready' ? locating.origin : null;
  const provinces = useMemo(() => provincesOf(facilities), [facilities]);
  const filtered = useMemo(
    () => filterFacilities(facilities, { province, query }),
    [facilities, province, query],
  );
  const arranged = useMemo(() => arrangeFacilities(filtered, origin), [filtered, origin]);
  const shown = arranged.slice(0, visible);

  function locate() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setLocating({
        state: 'failed',
        message: 'Peramban ini tidak mendukung lokasi. Pilih provinsi saja.',
      });
      return;
    }
    setLocating({ state: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!isValidCoordinates(latitude, longitude)) {
          setLocating({ state: 'failed', message: FAILURE[2] as string });
          return;
        }
        setLocating({ state: 'ready', origin: { lat: latitude, lng: longitude } });
        setVisible(PAGE_SIZE);
      },
      (error) =>
        setLocating({ state: 'failed', message: FAILURE[error.code] ?? (FAILURE[2] as string) }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  if (loadFailed) {
    return (
      <div role="alert">
        <EmptyState
          icon={<MapPin />}
          title="Daftar layanan belum bisa dimuat"
          headingLevel="h2"
          description={`Ada gangguan saat mengambil daftar. Muat ulang halaman sebentar lagi. Kalau kamu butuh bantuan sekarang, hubungi ${PRIMARY_CRISIS_RESOURCE.name} di ${PRIMARY_CRISIS_RESOURCE.displayNumber} atau datang ke IGD terdekat.`}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {!verified ? (
        <Alert tone="info" title="Daftar ini masih contoh" titleAs="h2">
          Layanan di versi demo ini adalah data contoh yang belum diverifikasi, jadi jangan
          dijadikan satu-satunya pegangan. Untuk bantuan sekarang, hubungi{' '}
          {PRIMARY_CRISIS_RESOURCE.name} di {PRIMARY_CRISIS_RESOURCE.displayNumber} atau datang ke
          unit gawat darurat (IGD) terdekat.
        </Alert>
      ) : null}

      <Card as="section" aria-label="Cari layanan" className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Provinsi"
            value={province}
            onChange={(event) => {
              setProvince(event.target.value);
              setVisible(PAGE_SIZE);
            }}
          >
            <option value="">Semua provinsi</option>
            {provinces.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          <Input
            label="Cari nama atau kota"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(PAGE_SIZE);
            }}
            autoComplete="off"
            maxLength={80}
          />
        </div>

        <div className="grid gap-2">
          {locating.state === 'ready' ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setLocating({ state: 'idle' })}>
                Hapus lokasiku
              </Button>
              <p id={noteId} className="text-sm text-fg-2">
                Diurutkan dari yang terdekat dengan lokasimu. Lokasimu hanya dipakai di perangkat
                ini dan tidak dikirim ke server.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={locate}
                loading={locating.state === 'locating'}
                aria-describedby={noteId}
              >
                <MapPinSimple aria-hidden />
                Urutkan dari lokasiku
              </Button>
              <p id={noteId} className="text-sm text-fg-3">
                Peramban akan meminta izin. Lokasimu hanya dipakai di perangkat ini dan tidak
                dikirim ke server.
              </p>
            </div>
          )}
          <p role="status" aria-live="polite" className="text-sm text-fg-2">
            {locating.state === 'locating'
              ? 'Menentukan lokasimu…'
              : locating.state === 'failed'
                ? locating.message
                : ''}
          </p>
        </div>
      </Card>

      <p role="status" aria-live="polite" className="text-sm text-fg-3">
        Menampilkan {shown.length} dari {arranged.length} layanan
        {arranged.length !== facilities.length ? ` (total ${facilities.length})` : ''}.
      </p>

      {arranged.length === 0 ? (
        <EmptyState
          icon={<MapPin />}
          title="Tidak ada layanan yang cocok"
          headingLevel="h2"
          description={`Coba ganti provinsi atau kata pencarian. Kalau kamu butuh bantuan sekarang, hubungi ${PRIMARY_CRISIS_RESOURCE.name} di ${PRIMARY_CRISIS_RESOURCE.displayNumber}.`}
        />
      ) : (
        <>
          <h2 className="sr-only">Daftar layanan</h2>
          <ul className="grid gap-3">
            {shown.map((facility) => {
              const tel = telHrefOf(facility.phone);
              const hasPoint = isValidCoordinates(facility.lat, facility.lng);
              return (
                <li key={facility.id}>
                  <Card
                    as="article"
                    variant="flat"
                    aria-labelledby={`faskes-${facility.id}`}
                    className="grid gap-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 id={`faskes-${facility.id}`} className="text-lg font-bold text-fg-1">
                        {facility.name}
                      </h3>
                      <Badge tone="sage">
                        {FACILITY_TYPE_LABEL[facility.type] ?? facility.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-fg-2">
                      {facility.address ? `${facility.address}, ` : ''}
                      {facility.city}, {facility.province}
                    </p>
                    {facility.distanceKm !== null ? (
                      <p className="text-sm font-semibold text-biru-700">
                        {formatDistance(facility.distanceKm)} dari lokasimu (garis lurus)
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-3">
                      {tel ? (
                        <Button variant="secondary" size="sm" href={tel}>
                          <Phone aria-hidden />
                          Telepon
                          <span className="sr-only"> {facility.name}</span>
                        </Button>
                      ) : null}
                      {hasPoint && facility.lat !== null && facility.lng !== null ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          href={openStreetMapLink(facility.lat, facility.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ArrowSquareOut aria-hidden />
                          Lihat di peta
                          <span className="sr-only"> {facility.name} (buka di tab baru)</span>
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {arranged.length > shown.length ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
            Tampilkan lebih banyak
          </Button>
        </div>
      ) : null}
    </div>
  );
}
