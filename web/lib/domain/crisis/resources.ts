/**
 * SUMBER TUNGGAL kontak krisis (aturan di CLAUDE.md).
 *
 * Semua UI yang menampilkan nomor darurat — CrisisBanner, tombol "Butuh bantuan sekarang",
 * pita krisis di landing, overlay teman cerita — WAJIB mengimpor dari sini. Jangan menulis
 * nomor langsung di komponen.
 *
 * ⚠️ BELUM DIVERIFIKASI. CLAUDE.md mencatat bahwa aplikasi Flutter melabeli "119 ext 8" sebagai
 * Into The Light, padahal itu layanan SEJIWA (Kemenkes). Argy wajib memverifikasi ulang setiap
 * nomor ke sumber resmi sebelum rilis, lalu ubah `verified` menjadi `true` + isi `verifiedAt`.
 */
export interface CrisisResource {
  id: string;
  /** Nama layanan. */
  name: string;
  /** Penyelenggara. */
  operator: string;
  /** Teks yang ditampilkan di tombol/daftar. */
  displayNumber: string;
  /** Nilai href `tel:`; koma = jeda sebelum ekstensi. */
  telHref: string;
  description: string;
  availability: string;
  verified: boolean;
  /** ISO date (YYYY-MM-DD) saat nomor terakhir diverifikasi manusia. */
  verifiedAt?: string;
}

export const SEJIWA_HOTLINE: CrisisResource = {
  id: 'sejiwa-119-ext-8',
  name: 'SEJIWA',
  operator: 'Kementerian Kesehatan RI',
  displayNumber: '119 ext. 8',
  telHref: 'tel:119,8',
  description: 'Layanan telepon kesehatan jiwa dari Kementerian Kesehatan.',
  availability: '24 jam',
  verified: false,
};

/**
 * Nomor darurat nasional untuk ancaman langsung pada nyawa (ambulans, polisi, pemadam kebakaran). Berbeda dari SEJIWA:
 * SEJIWA untuk bicara dengan konselor, 112 untuk bahaya yang sedang terjadi. Cakupan 112 bisa berbeda antar-daerah,
 * jadi halaman Bantuan selalu menyebut unit gawat darurat (IGD) terdekat sebagai cadangan.
 */
export const EMERGENCY_112: CrisisResource = {
  id: 'darurat-112',
  name: 'Layanan darurat nasional',
  operator: 'Pemerintah Republik Indonesia',
  displayNumber: '112',
  telHref: 'tel:112',
  description: 'Untuk bahaya yang sedang terjadi dan butuh bantuan segera di tempat.',
  availability: '24 jam',
  verified: false,
};

/** Urutan = urutan tampil. Resource pertama dianggap kontak utama. */
export const CRISIS_RESOURCES: readonly CrisisResource[] = [SEJIWA_HOTLINE, EMERGENCY_112];

export const PRIMARY_CRISIS_RESOURCE: CrisisResource = SEJIWA_HOTLINE;

/** Label tombol panggilan, mis. "Hubungi 119 ext. 8". */
export function crisisCallLabel(resource: CrisisResource = PRIMARY_CRISIS_RESOURCE): string {
  return `Hubungi ${resource.displayNumber}`;
}
