import '../entities/caregiver_entity.dart';

abstract class CaregiverRepository {
  Future<List<CaregiverRelationship>> getRelationshipsAsPatient(String patientId);
  Future<List<CaregiverRelationship>> getRelationshipsAsCaregiver(String caregiverId);
  Future<CaregiverRelationship> inviteCaregiver({
    required String patientId,
    required String caregiverPhone,
    required CaregiverPermissions permissions,
  });
  Future<CaregiverRelationship?> acceptInvite({
    required String inviteCode,
    required String caregiverId,
  });
  Future<void> removeCaregiver(String relationshipId);
  Future<PatientSummary?> getPatientSummary(String patientId, CaregiverPermissions permissions);
  List<CaregiverTip> getArticles();
}
