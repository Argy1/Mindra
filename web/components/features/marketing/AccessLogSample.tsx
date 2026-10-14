import { Avatar } from '@/components/ui/Avatar';

/**
 * Contoh riwayat akses untuk bagian privasi di landing. Isinya contoh tetap (bukan data nyata)
 * dan ditandai begitu di layar; tampilan aslinya ada di Privasi > Riwayat akses setelah masuk.
 */
const SAMPLE_ROWS = [
  { who: 'Rina Sari, M.Psi.', tone: 'biru', what: 'hasil skrining', when: 'Hari ini, 09.12' },
  { who: 'Ibu', tone: 'sage', what: 'mood harian', when: 'Kemarin, 20.40' },
  { who: 'Rina Sari, M.Psi.', tone: 'biru', what: 'catatan tidur', when: '12 Okt, 16.05' },
] as const;

export function AccessLogSample() {
  return (
    <div className="rounded-lg bg-canvas p-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="h3">Riwayat akses</h3>
        <p className="meta">Contoh tampilan</p>
      </div>
      <ul className="m-0 list-none p-0">
        {SAMPLE_ROWS.map((row, index) => (
          <li
            key={`${row.who}-${row.what}`}
            className={`flex items-center gap-3 py-3 text-sm ${index === 0 ? '' : 'border-t border-line-soft'}`}
          >
            <Avatar name={row.who} tone={row.tone} size="sm" />
            <span className="min-w-0 flex-1 text-fg-2">
              {row.who} membuka <strong className="text-fg-1">{row.what}</strong>
            </span>
            <span className="meta whitespace-nowrap">{row.when}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
