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
          // 119 ext. 8 adalah SEJIWA (layanan kesehatan jiwa Kementerian Kesehatan), BUKAN Into The Light.
          // Sumber tunggal di web: web/lib/domain/crisis/resources.ts. Nomor di daftar ini belum diverifikasi
          // ulang ke sumber resmi; verifikasi sebelum rilis.
          id: 'sejiwa',
          name: 'SEJIWA (Kemenkes)',
          phone: '119 ext 8',
          description:
              'Layanan telepon kesehatan jiwa dari Kementerian Kesehatan.',
          isAvailable24h: true,
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
