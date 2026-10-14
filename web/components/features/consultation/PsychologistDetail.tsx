import Link from 'next/link';
import { ArrowLeft, SealCheck } from '@phosphor-icons/react/ssr';
import {
  PsychologistAvatar,
  RatingLine,
} from '@/components/features/consultation/PsychologistCard';
import { SlotPicker } from '@/components/features/consultation/SlotPicker';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import {
  formatRupiah,
  languageLabel,
  type PsychologistCard as Psychologist,
} from '@/lib/domain/consultation/directory';
import { countAvailable, type SlotDay } from '@/lib/domain/consultation/slots';

/** Halaman satu psikolog: profil singkat dan pemilih jam. Dipakai juga oleh pratinjau /dev. */
export function PsychologistDetail({
  psychologist,
  days,
  backHref = '/konsultasi',
}: {
  psychologist: Psychologist;
  days: readonly SlotDay[];
  backHref?: string;
}) {
  const open = countAvailable(days);
  return (
    <>
      <p className="pt-3">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold no-underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Semua psikolog
        </Link>
      </p>

      <section aria-labelledby="judul" className="flex items-start gap-4 pt-1 pb-6">
        <PsychologistAvatar name={psychologist.name} size="lg" />
        <div className="min-w-0">
          <h1 id="judul" className="display-3">
            {psychologist.name}
          </h1>
          <p className="mt-1 body-m">{psychologist.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <RatingLine rating={psychologist.rating} reviews={psychologist.reviews} />
            {psychologist.verified ? (
              <Badge tone="neutral" dot={false}>
                <SealCheck aria-hidden weight="fill" className="size-3.5 text-biru-500" />
                Terverifikasi
              </Badge>
            ) : null}
            {psychologist.availableNow ? <Badge tone="sage">Tersedia sekarang</Badge> : null}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 wide:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card as="section" aria-labelledby="h-profil">
          <CardHeader title="Tentang psikolog ini" titleId="h-profil" />
          {psychologist.bio ? (
            <p className="body-m whitespace-pre-line">{psychologist.bio}</p>
          ) : (
            <p className="body-m">Psikolog ini belum menulis profil singkat.</p>
          )}
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-fg-3">Spesialisasi</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {psychologist.specializations.length === 0
                  ? '–'
                  : psychologist.specializations.map((entry) => (
                      <Badge key={entry} tone="neutral" dot={false}>
                        {entry}
                      </Badge>
                    ))}
              </dd>
            </div>
            <div>
              <dt className="text-fg-3">Bahasa</dt>
              <dd className="text-fg-1">
                {psychologist.languages.map(languageLabel).join(', ') || '–'}
              </dd>
            </div>
            <div>
              <dt className="text-fg-3">Tarif per sesi (50 menit)</dt>
              <dd className="font-semibold text-fg-1 num">{formatRupiah(psychologist.fee)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[0.8125rem] text-fg-3">
            Psikolog hanya melihat jam sesimu. Hasil skrining dan catatanmu baru terbuka bila kamu
            menautkan akun lewat <Link href="/privasi">Privasi dan izin</Link>.
          </p>
        </Card>

        <Card as="section" aria-labelledby="h-jadwal">
          <CardHeader
            title="Pesan sesi"
            titleId="h-jadwal"
            action={
              <span className="meta">{open > 0 ? `${open} jam tersedia` : 'Belum ada jam'}</span>
            }
          />
          {open === 0 ? (
            <p className="mb-4 body-m">
              Belum ada jam kosong dalam dua pekan ini. Coba lagi nanti atau lihat psikolog lain.
            </p>
          ) : null}
          <SlotPicker
            psychologistId={psychologist.id}
            psychologistName={psychologist.name}
            fee={psychologist.fee}
            days={days}
          />
        </Card>
      </div>
    </>
  );
}
