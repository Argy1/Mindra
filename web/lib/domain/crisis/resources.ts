/**
 * SUMBER TUNGGAL kontak krisis (aturan di CLAUDE.md).
 *
 * Semua UI yang menampilkan nomor darurat — CrisisBanner, tombol "Butuh bantuan sekarang",
 * pita krisis di landing, overlay teman cerita — WAJIB mengimpor dari sini. Jangan menulis
 * nama atau nomor langsung di komponen.
 *
 * Status verifikasi (15 Okt 2026):
 *   - Healing119.id (119 ext. 8): DIVERIFIKASI ke halaman resmi Kemenkes (`sourceUrl`). Halaman itu memuat telepon
 *     119 ekstensi 8, chat WhatsApp lewat www.healing119.id, layanan gratis, "dukungan psikologis awal", dan jam
 *     layanan "dari pagi hingga malam hari". Halaman itu TIDAK menyebut 24 jam dan TIDAK menyebut SEJIWA: jangan
 *     menulis "24 jam" untuk layanan ini dan jangan menulis "berganti nama dari SEJIWA" sebagai fakta resmi
 *     (sebagian media dan direktori masih menyebut 119 ext. 8 sebagai SEJIWA, layanan yang diluncurkan 2020).
 *   - 112: BELUM diverifikasi manusia.
 * Aplikasi Flutter dulu melabeli 119 ext. 8 sebagai "Into The Light"; itu keliru.
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
  /** Kapan layanan bisa dihubungi, ditulis persis seperti sumber (dipakai dalam kalimat: "tersedia ..."). */
  availability: string;
  verified: boolean;
  /** ISO date (YYYY-MM-DD) saat nomor terakhir diverifikasi manusia. Wajib bila `verified`. */
  verifiedAt?: string;
  /** Sumber resmi yang dipakai saat verifikasi. Wajib bila `verified`. */
  sourceUrl?: string;
}

export const HEALING119_HOTLINE: CrisisResource = {
  id: 'healing119-119-ext-8',
  name: 'Healing119.id',
  operator: 'Kementerian Kesehatan RI',
  displayNumber: '119 ext. 8',
  telHref: 'tel:119,8',
  description:
    'Dukungan psikologis awal dari konselor lewat telepon 119 ext. 8 atau WhatsApp di healing119.id. Gratis.',
  availability: 'pagi hingga malam hari',
  verified: true,
  verifiedAt: '2026-10-15',
  sourceUrl:
    'https://kesprimkom.kemkes.go.id/konten/158/151/0/cegah-bunuh-diri-dukung-kesehatan-jiwa-kenali-layanan-healing119-id',
};

/**
 * Nomor darurat nasional untuk ancaman langsung pada nyawa (ambulans, polisi, pemadam kebakaran). Berbeda dari
 * Healing119.id: Healing119.id untuk bicara dengan konselor, 112 untuk bahaya yang sedang terjadi. Cakupan 112 bisa
 * berbeda antar-daerah, jadi halaman Bantuan selalu menyebut unit gawat darurat (IGD) terdekat sebagai cadangan.
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
export const CRISIS_RESOURCES: readonly CrisisResource[] = [HEALING119_HOTLINE, EMERGENCY_112];

export const PRIMARY_CRISIS_RESOURCE: CrisisResource = HEALING119_HOTLINE;

/** Label tombol panggilan, mis. "Hubungi 119 ext. 8". */
export function crisisCallLabel(resource: CrisisResource = PRIMARY_CRISIS_RESOURCE): string {
  return `Hubungi ${resource.displayNumber}`;
}
