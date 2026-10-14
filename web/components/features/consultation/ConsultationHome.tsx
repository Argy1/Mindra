import { UsersThree } from '@phosphor-icons/react/ssr';
import { DirectoryFilters } from '@/components/features/consultation/DirectoryFilters';
import { PsychologistCard } from '@/components/features/consultation/PsychologistCard';
import { SessionList } from '@/components/features/consultation/SessionList';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  DirectoryFilters as Filters,
  PsychologistCard as Psychologist,
} from '@/lib/domain/consultation/directory';
import type { SessionItem } from '@/lib/domain/consultation/sessions';

interface ConsultationHomeProps {
  upcoming: readonly SessionItem[];
  past: readonly SessionItem[];
  now: Date;
  /** Hasil setelah disaring dan diurutkan. */
  results: readonly Psychologist[];
  /** Jumlah psikolog sebelum disaring. */
  total: number;
  filters: Filters;
  facets: { specializations: string[]; languages: string[] };
  action?: string;
}

/** Isi halaman Konsultasi. Dipisah dari halaman supaya /dev/konsultasi memakai tampilan yang sama persis. */
export function ConsultationHome({
  upcoming,
  past,
  now,
  results,
  total,
  filters,
  facets,
  action = '/konsultasi',
}: ConsultationHomeProps) {
  return (
    <>
      <section aria-labelledby="judul" className="pt-4 pb-6">
        <h1 id="judul" className="display-3">
          Konsultasi
        </h1>
        <p className="mt-1.5 lead max-w-[60ch]">
          Bicara dengan psikolog. Pilih psikolog, pilih jam yang cocok, lalu pesan. Satu sesi
          berlangsung 50 menit.
        </p>
      </section>

      <div className="grid gap-5">
        <Card as="section" aria-labelledby="h-sesi">
          <CardHeader title="Sesi kamu" titleId="h-sesi" />
          <SessionList items={upcoming} now={now} />
          {past.length > 0 ? (
            <details className="mt-5 rounded-lg bg-sunken px-4 py-3">
              <summary className="cursor-pointer font-semibold text-fg-1">
                Riwayat sesi ({past.length})
              </summary>
              <div className="mt-3">
                <SessionList items={past} now={now} />
              </div>
            </details>
          ) : null}
        </Card>

        <Card as="section" aria-labelledby="h-cari">
          <CardHeader title="Cari psikolog" titleId="h-cari" />
          <DirectoryFilters filters={filters} facets={facets} action={action} />
        </Card>

        <section aria-labelledby="h-hasil">
          <h2 id="h-hasil" className="mb-3 h3">
            {results.length === total
              ? `${total} psikolog`
              : `${results.length} dari ${total} psikolog`}
          </h2>
          {results.length === 0 ? (
            <EmptyState
              icon={<UsersThree />}
              title="Belum ada yang cocok"
              description="Coba kata kunci lain atau hapus beberapa filter."
              headingLevel="h3"
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 wide:grid-cols-3">
              {results.map((psychologist) => (
                <li key={psychologist.id}>
                  <PsychologistCard psychologist={psychologist} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
