import { Buildings, WarningCircle } from '@phosphor-icons/react/ssr';
import { EmptyState } from '@/components/ui/EmptyState';

/** Akun faskes yang belum dihubungkan ke satu faskes pun. */
export function NoFacility() {
  return (
    <div className="pt-6">
      <EmptyState
        icon={<Buildings />}
        title="Akunmu belum terhubung ke faskes"
        description="Minta admin Mindra menghubungkan akunmu ke faskes. Setelah itu angka wilayah muncul di sini."
        headingLevel="h1"
      />
    </div>
  );
}

/** Angka belum bisa dimuat. Pesan umum: detail galat database tidak ditampilkan. */
export function DataError() {
  return (
    <div className="pt-6" role="alert">
      <EmptyState
        icon={<WarningCircle />}
        title="Angka belum bisa dimuat"
        description="Ada gangguan saat mengambil data wilayah. Muat ulang halaman sebentar lagi. Bila terus begini, pastikan verifikasi dua langkah di akunmu sudah selesai."
        headingLevel="h1"
      />
    </div>
  );
}
