import '../../domain/entities/psychologist_entity.dart';

class PsychologistModel extends Psychologist {
  const PsychologistModel({
    required super.id,
    required super.name,
    required super.title,
    required super.photoUrl,
    required super.rating,
    required super.reviewCount,
    required super.specializations,
    required super.bio,
    required super.pricePerSession,
    required super.isAvailableNow,
    required super.isHimpsiVerified,
    super.licenseNumber,
  });

  factory PsychologistModel.fromJson(Map<String, dynamic> j) =>
      PsychologistModel(
        id: j['id'] as String,
        name: j['full_name'] as String? ?? '',
        title: j['title'] as String? ?? 'M.Psi., Psikolog',
        photoUrl: j['photo_url'] as String? ?? '',
        rating: (j['rating_average'] as num?)?.toDouble() ?? 0.0,
        reviewCount: j['total_reviews'] as int? ?? 0,
        specializations: List<String>.from(j['specializations'] as List? ?? []),
        bio: j['bio'] as String? ?? '',
        pricePerSession: j['consultation_fee'] as int? ?? 0,
        isAvailableNow: j['is_available_now'] as bool? ?? false,
        isHimpsiVerified: j['himpsi_verified'] as bool? ?? false,
        licenseNumber: j['license_number'] as String?,
      );
}
