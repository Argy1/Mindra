import 'package:flutter/foundation.dart';

import '../../domain/entities/facility_entity.dart';
import '../../domain/repositories/facilities_repository.dart';
import '../datasources/facilities_static_data.dart';
import '../models/facility_model.dart';

class FacilitiesRepositoryImpl implements FacilitiesRepository {
  const FacilitiesRepositoryImpl(this._client);
  final dynamic _client;

  @override
  Future<List<MentalHealthFacility>> getFacilities({
    double? lat,
    double? lng,
    double radiusKm = 50,
  }) async {
    List<MentalHealthFacility> facilities;

    // Primary: Supabase table (populated from admin panel / SATUSEHAT import)
    try {
      final data =
          await _client.from('mental_health_facilities').select() as List;
      if (data.isEmpty) throw Exception('empty');
      facilities = data
          .map((e) =>
              MentalHealthFacilityModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint(
          'Gagal memuat fasilitas dari Supabase, memakai data lokal: $e');
      // Fallback: hardcoded Kemenkes data
      facilities =
          kStaticFacilities.map(MentalHealthFacilityModel.fromJson).toList();
    }

    // Enrich with distance if location is available
    if (lat != null && lng != null) {
      facilities = facilities.map((f) => f.withDistance(lat, lng)).toList();
    }

    return facilities;
  }

  @override
  Future<List<MentalHealthFacility>> searchFacilities(String query) async {
    final all = await getFacilities();
    final q = query.toLowerCase();
    return all
        .where((f) =>
            f.name.toLowerCase().contains(q) ||
            f.address.toLowerCase().contains(q))
        .toList();
  }
}
