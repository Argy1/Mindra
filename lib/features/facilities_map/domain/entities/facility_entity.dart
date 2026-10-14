import 'dart:math' as math;

enum FacilityType { puskesmas, rsjiwa, klinikJiwa, psikiater }

extension FacilityTypeExt on FacilityType {
  String get label => switch (this) {
        FacilityType.puskesmas => 'Puskesmas',
        FacilityType.rsjiwa => 'RS Jiwa',
        FacilityType.klinikJiwa => 'Klinik Jiwa',
        FacilityType.psikiater => 'Psikiater BPJS',
      };

  String get emoji => switch (this) {
        FacilityType.puskesmas => '🏥',
        FacilityType.rsjiwa => '🏨',
        FacilityType.klinikJiwa => '🧠',
        FacilityType.psikiater => '👨‍⚕️',
      };
}

class MentalHealthFacility {
  const MentalHealthFacility({
    required this.id,
    required this.name,
    required this.type,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.phone,
    this.openingHours,
    this.services = const [],
    this.isVerified = false,
    this.hasIgd = false,
    this.hasBpjs = false,
    this.distanceKm,
  });

  final String id;
  final String name;
  final FacilityType type;
  final String address;
  final double latitude;
  final double longitude;
  final String? phone;

  /// Human-readable hours, e.g. "Sen–Jum 08:00–16:00 | IGD 24 Jam"
  final String? openingHours;
  final List<String> services;
  final bool isVerified;
  final bool hasIgd;
  final bool hasBpjs;

  /// Null when user location is unavailable.
  final double? distanceKm;

  bool get isOpenNow {
    if (hasIgd) return true; // IGD always open
    final now = DateTime.now();
    return now.weekday <= 5 && now.hour >= 8 && now.hour < 16;
  }

  String get distanceLabel {
    if (distanceKm == null) return '—';
    if (distanceKm! < 1) return '${(distanceKm! * 1000).round()} m';
    return '${distanceKm!.toStringAsFixed(1)} km';
  }

  MentalHealthFacility withDistance(double userLat, double userLng) {
    return MentalHealthFacility(
      id: id,
      name: name,
      type: type,
      address: address,
      latitude: latitude,
      longitude: longitude,
      phone: phone,
      openingHours: openingHours,
      services: List.unmodifiable(services),
      isVerified: isVerified,
      hasIgd: hasIgd,
      hasBpjs: hasBpjs,
      distanceKm: _haversineKm(userLat, userLng, latitude, longitude),
    );
  }

  static double _haversineKm(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const r = 6371.0;
    final dLat = _toRad(lat2 - lat1);
    final dLng = _toRad(lng2 - lng1);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRad(lat1)) *
            math.cos(_toRad(lat2)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  }

  static double _toRad(double deg) => deg * (math.pi / 180);
}
