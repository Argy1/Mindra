/**
 * Petunjuk "sepertinya sudah masuk" untuk halaman publik yang dibuat statis (header marketing). Hanya membaca
 * ADA-TIDAKNYA cookie sesi Supabase (`sb-<ref>-auth-token`, bisa terpecah `.0`, `.1`), tanpa memuat klien
 * Supabase dan tanpa menjadikan halaman dinamis. Ini bukan pemeriksaan keamanan: isinya tidak dibaca, dan yang
 * menentukan akses tetap middleware + RLS. Cookie yang sudah kedaluwarsa paling buruk membuat tombol "Ke dasbor"
 * mengarah ke /masuk, yang memang tujuan pengguna yang belum masuk.
 */
const AUTH_COOKIE = /(?:^|;\s*)sb-[^=;\s]+-auth-token(?:\.\d+)?=[^;]+/;

export function hasAuthCookie(cookieHeader: string): boolean {
  return AUTH_COOKIE.test(cookieHeader);
}
