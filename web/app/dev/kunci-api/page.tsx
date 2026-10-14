import { ApiKeyManager } from '@/components/features/faskes/ApiKeyManager';
import { AppShell } from '@/components/layout/AppShell';
import type { ApiKeyOverview } from '@/lib/server/faskes';

const FACILITY = '66666666-6666-4666-8666-666666666666';

const SAMPLE: ApiKeyOverview = {
  facilities: [
    { id: FACILITY, name: 'Puskesmas Bogor Tengah', city: 'Kota Bogor', province: 'Jawa Barat' },
  ],
  keys: [
    {
      id: '77777777-7777-4777-8777-777777777777',
      name: 'Dinkes Kota Bogor, sistem pelaporan',
      prefix: 'k7M2qX9r',
      facilityId: FACILITY,
      facilityName: 'Puskesmas Bogor Tengah',
      scopes: ['aggregates:read'],
      createdAt: '2026-10-01T03:00:00+07:00',
      lastUsedAt: '2026-10-12T09:15:00+07:00',
      revokedAt: null,
    },
    {
      id: '88888888-8888-4888-8888-888888888888',
      name: 'Uji coba integrasi',
      prefix: 'Zp4tYw1n',
      facilityId: FACILITY,
      facilityName: 'Puskesmas Bogor Tengah',
      scopes: ['aggregates:read'],
      createdAt: '2026-09-20T03:00:00+07:00',
      lastUsedAt: null,
      revokedAt: '2026-09-25T10:00:00+07:00',
    },
  ],
};

/**
 * Pratinjau manajemen kunci API dengan data contoh. `?kosong=1` = belum ada kunci; `?tanpa-faskes=1` = akun
 * belum tertaut ke faskes. Formulir memakai Server Action asli, jadi di sini menjawab "sesimu sudah berakhir".
 */
export default async function ApiKeyPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ kosong?: string; 'tanpa-faskes'?: string }>;
}) {
  const params = await searchParams;
  const overview: ApiKeyOverview = {
    facilities: params['tanpa-faskes'] === '1' ? [] : SAMPLE.facilities,
    keys: params.kosong === '1' ? [] : SAMPLE.keys,
  };

  return (
    <AppShell
      role="facility_admin"
      user={{ name: 'Admin Faskes A', roleLabel: 'Admin faskes' }}
      currentPath="/faskes/kunci-api"
      topbarStart={<p>Selasa, 13 Oktober</p>}
    >
      <ApiKeyManager overview={overview} />
    </AppShell>
  );
}
