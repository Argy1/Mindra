import { PRIMARY_CRISIS_RESOURCE, type CrisisResource } from '@/lib/domain/crisis/resources';

/**
 * Balasan TETAP saat teks pengguna mengandung tanda krisis. Ditulis di sini, bukan dibuat model: pada saat
 * paling rentan, jawaban tidak boleh bergantung pada keluaran model yang bisa berubah atau gagal. Nomor
 * diambil dari sumber tunggal kontak krisis.
 */
export function buildCrisisReply(resource: CrisisResource = PRIMARY_CRISIS_RESOURCE): string {
  return [
    'Terima kasih sudah menuliskannya. Yang kamu rasakan terdengar sangat berat, dan kamu tidak harus menanggungnya sendirian.',
    'Apakah kamu aman sekarang? Kalau ada dorongan untuk menyakiti dirimu, tolong hubungi ' +
      `${resource.name} di ${resource.displayNumber} sekarang. Layanan ini buka ${resource.availability}. ` +
      'Kalau bisa, minta seseorang yang kamu percaya untuk menemanimu.',
    'Aku tetap di sini kalau kamu mau lanjut bercerita.',
  ].join('\n\n');
}
