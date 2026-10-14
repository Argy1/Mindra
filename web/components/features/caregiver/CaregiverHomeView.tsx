import Link from 'next/link';
import { CaretRight, UsersThree } from '@phosphor-icons/react/ssr';
import { AcceptInviteForm } from '@/components/features/caregiver/AcceptInviteForm';
import { CaregiverTips } from '@/components/features/caregiver/CaregiverTips';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CAREGIVER_PERMISSION_KEYS, PERMISSION_LABEL } from '@/lib/domain/privacy/permissions';
import type { CaregiverPatient } from '@/lib/server/caregiver';
import { formatDateId } from '@/lib/utils/date';

/** Isi beranda pendamping. Dipisah dari halaman untuk /dev/pendamping. */
export function CaregiverHomeView({
  name,
  people,
}: {
  /** Nama panggilan pendamping. */
  name: string;
  people: readonly CaregiverPatient[];
}) {
  return (
    <>
      <section aria-labelledby="sapa" className="pt-4 pb-6">
        <h1 id="sapa" className="display-3">
          {name ? `Halo, ${name}.` : 'Halo.'}
        </h1>
        <p className="mt-1.5 lead max-w-[62ch]">
          Kamu hanya melihat hal yang diizinkan oleh orang yang kamu dampingi. Izin itu bisa mereka
          ubah atau cabut kapan saja.
        </p>
      </section>

      <div className="grid items-start gap-5 wide:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card as="section" aria-labelledby="h-orang">
          <CardHeader title="Orang yang kamu dampingi" titleId="h-orang" />
          {people.length === 0 ? (
            <EmptyState
              icon={<UsersThree />}
              title="Belum ada yang kamu dampingi"
              description="Minta orang yang ingin kamu dampingi membuat undangan dari halaman Privasi dan izin di Mindra, lalu masukkan kodenya di samping."
              headingLevel="h3"
            />
          ) : (
            <ul className="grid">
              {people.map((person) => {
                const shared = CAREGIVER_PERMISSION_KEYS.filter((key) => person.permissions[key]);
                return (
                  <li
                    key={person.relationshipId}
                    className="border-t border-line-soft first:border-t-0"
                  >
                    <Link
                      href={`/pendamping/${person.patientId}`}
                      className="-mx-3 flex items-center gap-3 rounded-md px-3 py-4 no-underline hover:bg-sunken"
                    >
                      <Avatar name={person.name} tone="sage" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-fg-1">{person.name}</span>
                        <span className="block meta">
                          Mendampingi sejak{' '}
                          {formatDateId(new Date(person.since), {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="mt-1 block text-sm text-fg-2">
                          {shared.length > 0
                            ? `Yang dibagikan: ${shared.map((key) => PERMISSION_LABEL[key]!.toLowerCase()).join(', ')}.`
                            : 'Belum ada data yang dibagikan.'}
                        </span>
                      </span>
                      <CaretRight aria-hidden className="size-5 shrink-0 text-fg-4" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card as="section" aria-labelledby="h-undangan">
          <CardHeader title="Terima undangan" titleId="h-undangan" />
          <AcceptInviteForm />
        </Card>
      </div>

      <div className="mt-8">
        <CaregiverTips />
      </div>
    </>
  );
}
