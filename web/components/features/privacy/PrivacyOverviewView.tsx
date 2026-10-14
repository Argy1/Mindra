import { DownloadSimple, ShieldCheck } from '@phosphor-icons/react/ssr';
import { AccessLogList } from '@/components/features/privacy/AccessLogList';
import {
  ConnectPsychologist,
  type ConnectOption,
} from '@/components/features/privacy/ConnectPsychologist';
import { InviteCaregiver } from '@/components/features/privacy/InviteCaregiver';
import { PermissionToggles } from '@/components/features/privacy/PermissionToggles';
import { RevokeAccessButton } from '@/components/features/privacy/RevokeAccessButton';
import { SatusehatConsent } from '@/components/features/privacy/SatusehatConsent';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  CAREGIVER_PERMISSION_KEYS,
  PSYCHOLOGIST_PERMISSION_KEYS,
} from '@/lib/domain/privacy/permissions';
import type { PrivacyOverview } from '@/lib/server/privacy';
import { formatDateId } from '@/lib/utils/date';

interface PrivacyOverviewViewProps {
  overview: PrivacyOverview;
  connectable: readonly ConnectOption[];
  now: Date;
}

const since = (iso: string) =>
  formatDateId(new Date(iso), { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Isi halaman Privasi dan izin (design/app-privasi.html). Dipisah dari halaman supaya data contoh di
 * /dev/privasi memakai tampilan yang persis sama dengan halaman sungguhan.
 */
export function PrivacyOverviewView({ overview, connectable, now }: PrivacyOverviewViewProps) {
  const nobody = overview.psychologists.length === 0 && overview.caregivers.length === 0;

  return (
    <>
      <section aria-labelledby="judul" className="max-w-[62ch] pt-4 pb-7">
        <h1 id="judul" className="display-3">
          Datamu, aturanmu.
        </h1>
        <p className="mt-2 lead">
          Pilih siapa yang boleh melihat apa. Perubahan berlaku saat itu juga, dan setiap kali
          datamu dibuka, kamu bisa melihatnya di sini.
        </p>
      </section>

      <div className="grid items-start gap-5 wide:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card as="section" hero aria-labelledby="h-akses">
          <CardHeader title="Yang punya akses" titleId="h-akses" />

          {nobody ? (
            <EmptyState
              icon={<ShieldCheck />}
              title="Saat ini hanya kamu yang bisa melihat datamu"
              description="Kamu bisa menghubungkan psikolog atau mengundang pendamping kapan saja, dan memilih data apa yang mereka lihat."
              headingLevel="h3"
            />
          ) : (
            <ul>
              {overview.psychologists.map((link) => {
                const name = link.name ?? 'Psikolog';
                return (
                  <li
                    key={link.id}
                    className="border-t border-line-soft py-5 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Avatar name={name} tone="biru" />
                      <div className="min-w-0 flex-1 basis-48">
                        <h3 className="font-semibold text-fg-1">{name}</h3>
                        <p className="meta">Psikolog · sejak {since(link.consentedAt)}</p>
                      </div>
                      <RevokeAccessButton kind="psychologist" id={link.id} name={name} />
                    </div>
                    <PermissionToggles
                      kind="psychologist"
                      id={link.id}
                      ownerName={name}
                      keys={PSYCHOLOGIST_PERMISSION_KEYS}
                      permissions={link.permissions}
                    />
                  </li>
                );
              })}

              {overview.caregivers.map((link) => {
                const pending = link.status === 'pending';
                const name =
                  link.name ?? (link.phone ? `Undangan untuk ${link.phone}` : 'Pendamping');
                return (
                  <li
                    key={link.id}
                    className="border-t border-line-soft py-5 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Avatar name={link.name ?? 'Pendamping'} tone="sage" />
                      <div className="min-w-0 flex-1 basis-48">
                        <h3 className="font-semibold text-fg-1">{name}</h3>
                        <p className="meta">
                          {pending
                            ? `Pendamping · undangan belum diterima, dibuat ${since(link.createdAt)}`
                            : `Pendamping · sejak ${since(link.createdAt)}`}
                        </p>
                        {pending && link.inviteCode ? (
                          <p className="mt-1 text-sm text-fg-2">
                            Kode undangan:{' '}
                            <strong className="font-mono tracking-wider text-fg-1">
                              {link.inviteCode}
                            </strong>
                          </p>
                        ) : null}
                      </div>
                      <RevokeAccessButton
                        kind="caregiver"
                        id={link.id}
                        name={name}
                        invitePending={pending}
                      />
                    </div>
                    <PermissionToggles
                      kind="caregiver"
                      id={link.id}
                      ownerName={name}
                      keys={CAREGIVER_PERMISSION_KEYS}
                      permissions={link.permissions}
                    />
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 grid gap-3">
            <InviteCaregiver />
            <ConnectPsychologist options={connectable} />
          </div>
        </Card>

        <div className="grid gap-5">
          <Card as="section" aria-labelledby="h-riwayat">
            <CardHeader
              title="Riwayat akses"
              titleId="h-riwayat"
              action={
                // Tautan biasa (bukan next/link) supaya browser mengunduh berkasnya, bukan menavigasi.
                <a
                  href="/privasi/riwayat"
                  download
                  className="inline-flex items-center gap-1.5 meta text-biru-600 no-underline hover:underline"
                >
                  <DownloadSimple aria-hidden className="size-4" />
                  Unduh CSV
                </a>
              }
            />
            <AccessLogList entries={overview.accessLog} now={now} />
          </Card>

          <Card as="section" aria-labelledby="h-satusehat">
            <h2 id="h-satusehat" className="mb-3 h3">
              SATUSEHAT
            </h2>
            <div className="flex items-center gap-3.5">
              <p className="flex-1 body-m">
                Kirim hasil skrining ke rekam kesehatan nasionalmu supaya dokter di puskesmas atau
                rumah sakit bisa melihatnya. Tidak ada yang dikirim sebelum kamu memilih hasilnya.
              </p>
              <SatusehatConsent enabled={overview.satusehatConsent} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
