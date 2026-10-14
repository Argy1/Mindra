import type { Metadata } from 'next';
import { ClientTable } from '@/components/features/psychologist/ClientTable';
import { Card } from '@/components/ui/Card';
import { requireMfaPsychologist } from '@/lib/auth/mfa-server';
import { isClientFilter, type ClientFilter } from '@/lib/domain/psychologist/summary';
import { getClientList } from '@/lib/server/psychologist';

export const metadata: Metadata = { title: 'Klien' };

interface PageProps {
  searchParams: Promise<{ filter?: string | string[] }>;
}

export default async function KlienPage({ searchParams }: PageProps) {
  await requireMfaPsychologist();
  const params = await searchParams;
  const rawFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const filter: ClientFilter = isClientFilter(rawFilter) ? rawFilter : 'semua';
  const { summaries } = await getClientList();

  return (
    <>
      <section aria-labelledby="judul" className="pt-4 pb-6">
        <h1 id="judul" className="display-3">
          Klien
        </h1>
        <p className="mt-1 body-m">
          {summaries.length} klien aktif. Yang paling perlu perhatian ada di atas.
        </p>
      </section>
      <Card as="section" aria-label="Daftar klien">
        <ClientTable summaries={summaries} filter={filter} basePath="/psikolog/klien" />
      </Card>
    </>
  );
}
