import '../entities/facility_entity.dart';

abstract class FacilitiesRepository {
  Future<List<MentalHealthFacility>> getFacilities({
    double? lat,
    double? lng,
    double radiusKm = 10,
  });
  Future<List<MentalHealthFacility>> searchFacilities(String query);
}
