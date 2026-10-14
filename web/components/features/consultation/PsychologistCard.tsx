import Link from 'next/link';
import { SealCheck, Star } from '@phosphor-icons/react/ssr';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  formatRupiah,
  initialsOf,
  languageLabel,
  type PsychologistCard as Psychologist,
} from '@/lib/domain/consultation/directory';
import { formatDecimalId } from '@/lib/utils/date';

/** Avatar bulat dengan inisial (foto tidak dimuat: tidak ada pihak ketiga yang menerima permintaan gambar). */
export function PsychologistAvatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={
        size === 'lg'
          ? 'grid size-16 flex-none place-items-center rounded-full bg-biru-100 font-display text-2xl text-biru-700'
          : 'grid size-12 flex-none place-items-center rounded-full bg-biru-100 font-display text-lg text-biru-700'
      }
    >
      {initialsOf(name)}
    </span>
  );
}

export function RatingLine({ rating, reviews }: { rating: number; reviews: number }) {
  if (reviews <= 0) return <span className="meta">Belum ada penilaian</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-fg-2">
      <Star aria-hidden weight="fill" className="size-4 text-matahari-500" />
      <span className="num">{formatDecimalId(rating)}</span>
      <span className="text-fg-3">({reviews} penilaian)</span>
    </span>
  );
}

/** Kartu satu psikolog di direktori. Seluruh kartu adalah satu tautan ke halaman jadwalnya. */
export function PsychologistCard({ psychologist }: { psychologist: Psychologist }) {
  return (
    <Card
      as="article"
      className="relative h-full transition-shadow duration-(--dur-fast) hover:shadow-md"
    >
      <div className="flex items-start gap-3.5">
        <PsychologistAvatar name={psychologist.name} />
        <div className="min-w-0 flex-1">
          <h3 className="h3">
            <Link
              href={`/konsultasi/${psychologist.id}`}
              className="text-fg-1 no-underline after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-lg"
            >
              {psychologist.name}
            </Link>
          </h3>
          <p className="meta">{psychologist.title}</p>
          <div className="mt-1">
            <RatingLine rating={psychologist.rating} reviews={psychologist.reviews} />
          </div>
        </div>
      </div>

      {psychologist.specializations.length > 0 ? (
        <ul aria-label="Spesialisasi" className="mt-3.5 flex flex-wrap gap-1.5">
          {psychologist.specializations.slice(0, 4).map((entry) => (
            <li key={entry}>
              <Badge tone="neutral" dot={false}>
                {entry}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="mt-3.5 grid gap-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-fg-3">Bahasa</dt>
          <dd className="text-fg-1">
            {psychologist.languages.map(languageLabel).join(', ') || '–'}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-fg-3">Tarif per sesi</dt>
          <dd className="font-semibold text-fg-1 num">{formatRupiah(psychologist.fee)}</dd>
        </div>
      </dl>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {psychologist.availableNow ? <Badge tone="sage">Tersedia sekarang</Badge> : null}
        {psychologist.verified ? (
          <Badge tone="neutral" dot={false}>
            <SealCheck aria-hidden weight="fill" className="size-3.5 text-biru-500" />
            Terverifikasi
          </Badge>
        ) : null}
      </div>
    </Card>
  );
}
