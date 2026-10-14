import { Key } from '@phosphor-icons/react/ssr';
import { CreateApiKeyForm } from '@/components/features/faskes/CreateApiKeyForm';
import { RevokeKeyButton } from '@/components/features/faskes/RevokeKeyButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { displayApiKeyPrefix } from '@/lib/api/keys';
import type { ApiKeyOverview } from '@/lib/server/faskes';
import { MAX_ACTIVE_API_KEYS } from '@/lib/validation/faskes';
import { formatDateId } from '@/lib/utils/date';

const date = (iso: string) =>
  formatDateId(new Date(iso), { day: 'numeric', month: 'long', year: 'numeric' });

/** Isi halaman /faskes/kunci-api. Dipisah dari halaman supaya /dev/kunci-api memakai tampilan yang sama. */
export function ApiKeyManager({ overview }: { overview: ApiKeyOverview }) {
  const active = overview.keys.filter((key) => !key.revokedAt);
  const revoked = overview.keys.filter((key) => key.revokedAt);

  return (
    <>
      <section aria-labelledby="judul" className="max-w-[62ch] pt-4 pb-6">
        <h1 id="judul" className="display-3">
          Kunci API
        </h1>
        <p className="mt-1.5 lead">
          Beri sistem mitra akses baca ke agregat anonim wilayahmu. Tidak ada data individu: grup
          kecil disembunyikan dan angka hanya tampil bila diisi cukup banyak orang.
        </p>
        <p className="mt-3">
          <Button href="/developers" variant="secondary" size="sm">
            Baca dokumentasi API
          </Button>
        </p>
      </section>

      <div className="grid items-start gap-5 wide:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card as="section" aria-labelledby="h-buat">
          <CardHeader title="Buat kunci baru" titleId="h-buat" />
          <CreateApiKeyForm facilities={overview.facilities} />
        </Card>

        <Card as="section" aria-labelledby="h-daftar">
          <CardHeader
            title="Kunci aktif"
            titleId="h-daftar"
            action={
              <span className="meta">
                {active.length} dari {MAX_ACTIVE_API_KEYS}
              </span>
            }
          />
          {active.length === 0 ? (
            <EmptyState
              icon={<Key />}
              title="Belum ada kunci aktif"
              description="Buat kunci pertamamu di sebelah. Kunci utuh hanya tampil sekali."
              headingLevel="h3"
            />
          ) : (
            <ul>
              {active.map((key) => (
                <li
                  key={key.id}
                  className="grid gap-1.5 border-t border-line-soft py-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-fg-1">{key.name}</p>
                    <RevokeKeyButton id={key.id} name={key.name} />
                  </div>
                  <p className="font-mono text-sm text-fg-2">{displayApiKeyPrefix(key.prefix)}</p>
                  <p className="meta">
                    {key.facilityName ?? 'Faskes tidak diketahui'} · dibuat {date(key.createdAt)} ·{' '}
                    {key.lastUsedAt
                      ? `terakhir dipakai ${date(key.lastUsedAt)}`
                      : 'belum pernah dipakai'}
                  </p>
                  <p className="flex flex-wrap gap-1.5">
                    {key.scopes.map((scope) => (
                      <Badge key={scope} tone="sage">
                        {scope}
                      </Badge>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {revoked.length > 0 ? (
        <Card as="section" aria-labelledby="h-dicabut" className="mt-5">
          <CardHeader title="Kunci yang sudah dicabut" titleId="h-dicabut" />
          <ul>
            {revoked.map((key) => (
              <li
                key={key.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft py-3 first:border-t-0 first:pt-0"
              >
                <span className="font-semibold text-fg-2">{key.name}</span>
                <span className="font-mono text-sm text-fg-3">
                  {displayApiKeyPrefix(key.prefix)}
                </span>
                <Badge tone="neutral">Dicabut {date(key.revokedAt!)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
