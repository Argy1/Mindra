import '../../domain/entities/facility_entity.dart';

class MentalHealthFacilityModel extends MentalHealthFacility {
  const MentalHealthFacilityModel({
    required super.id,
    required super.name,
    required super.type,
    required super.address,
    required super.latitude,
    required super.longitude,
    super.phone,
    super.openingHours,
    super.services,
    super.isVerified,
    super.hasIgd,
    super.hasBpjs,
    super.distanceKm,
  });

  factory MentalHealthFacilityModel.fromJson(Map<String, dynamic> j) {
    FacilityType parseType(String? raw) {
      return switch (raw?.toLowerCase()) {
        'rsjiwa' => FacilityType.rsjiwa,
        'klinikjiwa' || 'klinik_jiwa' => FacilityType.klinikJiwa,
        'psikiater' => FacilityType.psikiater,
        _ => FacilityType.puskesmas,
      };
    }

    final rawServices = j['services'];
    final services = rawServices is List
        ? List<String>.from(rawServices.map((e) => e.toString()))
        : <String>[];

    return MentalHealthFacilityModel(
      id: j['id'] as String? ?? '',
      name: j['name'] as String? ?? '',
      type: parseType(j['type'] as String?),
      address: j['address'] as String? ?? '',
      latitude: (j['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (j['longitude'] as num?)?.toDouble() ?? 0.0,
      phone: j['phone'] as String?,
      openingHours: j['opening_hours'] as String?,
      services: services,
      isVerified: j['is_verified'] as bool? ?? false,
      hasIgd: j['has_igd'] as bool? ?? false,
      hasBpjs: j['has_bpjs'] as bool? ?? false,
    );
  }
}
