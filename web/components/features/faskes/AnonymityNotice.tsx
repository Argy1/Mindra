import { ShieldCheck } from '@phosphor-icons/react/ssr';

/** Pengingat di setiap halaman angka: semuanya gabungan anonim. Teks mengikuti design/faskes-dashboard.html. */
export function AnonymityNotice() {
  return (
    <p className="mb-5 flex items-center gap-3 rounded-md bg-sage-50 px-4 py-3 text-sm text-sage-800">
      <ShieldCheck aria-hidden weight="duotone" className="size-[1.375rem] flex-none" />
      <span>
        Semua angka di halaman ini adalah gabungan anonim. Kelompok dengan kurang dari 10 orang
        tidak ditampilkan, dan tidak ada data perorangan yang bisa dibuka.
      </span>
    </p>
  );
}
