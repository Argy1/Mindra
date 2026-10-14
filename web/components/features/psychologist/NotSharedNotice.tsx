import { LockKey } from '@phosphor-icons/react/ssr';

interface NotSharedNoticeProps {
  /** Jenis data, mis. "mood harian". */
  what: string;
  /** Pemilik data: "Klien" di portal psikolog, nama orang di portal pendamping. */
  owner?: string;
}

/**
 * Pengganti isi bagian yang TIDAK dibagikan pemilik data. Menyatakan pilihan itu dengan jelas (bukan
 * "belum ada data"), karena bagi yang melihat dua hal itu berbeda dan tidak boleh tertukar.
 */
export function NotSharedNotice({ what, owner = 'Klien' }: NotSharedNoticeProps) {
  return (
    <p className="flex items-center gap-3 rounded-lg bg-sunken px-5 py-4 body-m">
      <LockKey aria-hidden className="size-5 shrink-0 text-fg-3" />
      {owner} tidak membagikan {what}. Itu pilihan yang bisa berubah kapan saja.
    </p>
  );
}
