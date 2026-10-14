import '../entities/crisis_resource_entity.dart';
import '../entities/emergency_contact_entity.dart';

abstract class CrisisRepository {
  Future<List<CrisisResource>> getResources();

  // Emergency contacts (user-managed)
  Future<List<EmergencyContact>> getEmergencyContacts(String userId);
  Future<EmergencyContact> addEmergencyContact({
    required String userId,
    required String name,
    required String phone,
    required ContactRelationship relationship,
    required bool isPrimary,
  });
  Future<EmergencyContact> updateEmergencyContact(EmergencyContact contact);
  Future<void> deleteEmergencyContact(String id);
}
