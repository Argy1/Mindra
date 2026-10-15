import {
  EMERGENCY_112,
  PRIMARY_CRISIS_RESOURCE,
  type CrisisResource,
} from '@/lib/domain/crisis/resources';

/**
 * Balasan TETAP saat teks pengguna mengandung tanda krisis. Ditulis di sini, bukan dibuat model: pada saat
 * paling rentan, jawaban tidak boleh bergantung pada keluaran model yang bisa berubah atau gagal. Nama, nomor,
 * dan jam layanan diambil dari sumber tunggal kontak krisis.
 *
 * Layanan utama (Healing119.id) buka pagi hingga malam hari, bukan 24 jam, jadi balasan selalu menyertakan
 * cadangan 24 jam (112 atau IGD terdekat) untuk orang yang menulis di luar jam itu.
 */
export function buildCrisisReply(resource: CrisisResource = PRIMARY_CRISIS_RESOURCE): string {
  return [
    'Terima kasih sudah menuliskannya. Yang kamu rasakan terdengar sangat berat, dan kamu tidak harus menanggungnya sendirian.',
    'Apakah kamu aman sekarang? Kalau ada dorongan untuk menyakiti dirimu, tolong hubungi ' +
      `${resource.name} di ${resource.displayNumber} sekarang. Layanan ini buka ${resource.availability}. ` +
      `Kalau belum ada yang menjawab, hubungi ${EMERGENCY_112.displayNumber} atau datang ke unit gawat darurat (IGD) terdekat; keduanya buka ${EMERGENCY_112.availability}. ` +
      'Kalau bisa, minta seseorang yang kamu percaya untuk menemanimu.',
    'Aku tetap di sini kalau kamu mau lanjut bercerita.',
  ].join('\n\n');
}
