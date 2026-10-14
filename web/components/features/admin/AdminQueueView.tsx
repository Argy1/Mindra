import { UserCheck } from '@phosphor-icons/react/ssr';
import { ApplicationCard } from '@/components/features/admin/ApplicationCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ACTION_LABEL } from '@/lib/domain/admin/review';
import type { PendingPsychologist, ReviewRecord } from '@/lib/server/admin';
import { formatDateId } from '@/lib/utils/date';

interface AdminQueueViewProps {
  pending: readonly PendingPsychologist[];
  history: readonly ReviewRecord[];
}

/**
 * Isi halaman admin (antrean peninjauan akun psikolog). Dipisah dari halaman supaya pratinjau /dev/admin memakai
 * tampilan yang persis sama dengan halaman sungguhan.
 */
export function AdminQueueView({ pending, history }: AdminQueueViewProps) {
  return (
    <>
      <section aria-labelledby="judul" className="max-w-[62ch] pt-4 pb-7">
        <h1 id="judul" className="display-3">
          Antrean psikolog
        </h1>
        <p className="mt-2 lead">
          Akun yang mendaftar sebagai psikolog menunggu di sini. Periksa nomor STR dan izin
          praktiknya di sumber resmi sebelum menyetujui. Halaman ini tidak membuka catatan kesehatan
          siapa pun.
        </p>
      </section>

      <div className="grid max-w-[62rem] gap-5">
        <section aria-labelledby="h-antre" className="grid gap-3">
          <h2 id="h-antre" className="h2">
            Menunggu tinjauan{' '}
            <span className="font-normal text-fg-3" aria-label={`${pending.length} permintaan`}>
              ({pending.length})
            </span>
          </h2>
          {pending.length === 0 ? (
            <EmptyState
              icon={<UserCheck />}
              title="Tidak ada permintaan yang menunggu"
              description="Permintaan baru muncul di sini begitu seseorang mendaftar sebagai psikolog."
              headingLevel="h3"
            />
          ) : (
            <ul className="grid gap-3">
              {pending.map((applicant) => (
                <li key={applicant.id}>
                  <ApplicationCard applicant={applicant} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <Card as="section" aria-labelledby="h-riwayat" variant="flat">
          <CardHeader title="Keputusan terakhir" titleId="h-riwayat" />
          {history.length === 0 ? (
            <p className="body-m">Belum ada keputusan.</p>
          ) : (
            <ul>
              {history.map((record) => (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft py-3 first:border-t-0 first:pt-0"
                >
                  <Badge tone={record.action === 'approve_psychologist' ? 'minimal' : 'neutral'}>
                    {ACTION_LABEL[record.action]}
                  </Badge>
                  <span className="min-w-0 flex-1 basis-40 text-fg-1">{record.targetName}</span>
                  <span className="meta">
                    {formatDateId(new Date(record.createdAt), {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
