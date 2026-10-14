import '../entities/consultation_entity.dart';
import '../entities/psychologist_entity.dart';
import '../entities/time_slot_entity.dart';
import '../../data/datasources/telemedicine_remote_datasource.dart';

export '../../data/datasources/telemedicine_remote_datasource.dart'
    show PsychologistSort;

abstract class TelemedicineRepository {
  Future<List<Psychologist>> getPsychologists({
    String query,
    String? specialization,
    PsychologistSort sort,
  });
  Future<Psychologist> getPsychologistById(String id);
  Future<List<TimeSlot>> getAvailableSlots(
      String psychologistId, DateTime date);
  Future<List<Consultation>> getUserConsultations(String userId);
  Future<Consultation> bookConsultation({
    required String psychologistId,
    required DateTime scheduledAt,
  });
  Future<void> cancelConsultation(String id);
  // Legacy
  Future<List<Consultation>> getUpcoming();
  Future<List<Consultation>> getHistory();
}
