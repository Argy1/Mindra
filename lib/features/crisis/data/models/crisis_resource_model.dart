import '../../domain/entities/crisis_resource_entity.dart';

class CrisisResourceModel extends CrisisResource {
  const CrisisResourceModel({
    required super.id,
    required super.name,
    required super.phone,
    required super.description,
    required super.isAvailable24h,
    super.whatsapp,
  });

  factory CrisisResourceModel.fromJson(Map<String, dynamic> j) =>
      CrisisResourceModel(
        id: j['id'] as String,
        name: j['name'] as String,
        phone: j['phone'] as String,
        description: j['description'] as String,
        isAvailable24h: j['is_available_24h'] as bool? ?? false,
        whatsapp: j['whatsapp'] as String?,
      );

  static List<CrisisResourceModel> get seeds => const [
        CrisisResourceModel(
          // 119 ext. 8 adalah Healing119.id (Kementerian Kesehatan), BUKAN Into The Light. Diverifikasi ke halaman
          // resmi Kemenkes pada 2026-10-15: https://kesprimkom.kemkes.go.id/konten/158/151/0/cegah-bunuh-diri-dukung-kesehatan-jiwa-kenali-layanan-healing119-id
          // Layanan beroperasi pagi hingga malam hari, BUKAN 24 jam (isAvailable24h harus false).
          // Sumber tunggal di web: web/lib/domain/crisis/resources.ts. Nomor lain di daftar ini belum diverifikasi.
          id: 'healing119',
          name: 'Healing119.id (Kemenkes)',
          phone: '119 ext 8',
          description:
              'Dukungan psikologis awal dari konselor lewat telepon 119 ext. 8 atau WhatsApp di healing119.id. Gratis, pagi hingga malam hari.',
          isAvailable24h: false,
        ),
        CrisisResourceModel(
          id: 'yayasan-pulih',
          name: 'Yayasan Pulih',
          phone: '(021) 788-42580',
          description: 'Konseling psikologis dan dukungan kesehatan mental.',
          isAvailable24h: false,
        ),
        CrisisResourceModel(
          id: 'kemenkes-hotline',
          name: 'Hotline Kemenkes RI',
          phone: '1500-454',
          description: 'Layanan informasi dan konsultasi kesehatan nasional.',
          isAvailable24h: true,
        ),
      ];
}
