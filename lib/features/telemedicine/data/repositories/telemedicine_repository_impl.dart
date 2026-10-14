import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/app_exception.dart';
import '../../domain/entities/consultation_entity.dart';
import '../../domain/entities/psychologist_entity.dart';
import '../../domain/entities/time_slot_entity.dart';
import '../../domain/repositories/telemedicine_repository.dart';
import '../datasources/telemedicine_remote_datasource.dart';
import '../models/consultation_model.dart';

class TelemedicineRepositoryImpl implements TelemedicineRepository {
  TelemedicineRepositoryImpl(this._client)
      : _ds = TelemedicineRemoteDatasourceImpl(_client);

  final SupabaseClient _client;
  final TelemedicineRemoteDatasourceImpl _ds;

  @override
  Future<List<Psychologist>> getPsychologists({
    String query = '',
    String? specialization,
    PsychologistSort sort = PsychologistSort.rating,
  }) =>
      _ds.getPsychologists(
          query: query, specialization: specialization, sort: sort);

  @override
  Future<Psychologist> getPsychologistById(String id) =>
      _ds.getPsychologistById(id);

  @override
  Future<List<TimeSlot>> getAvailableSlots(
          String psychologistId, DateTime date) =>
      _ds.getAvailableSlots(psychologistId, date);

  @override
  Future<List<Consultation>> getUserConsultations(String userId) =>
      _ds.getUserConsultations(userId);

  @override
  Future<Consultation> bookConsultation({
    required String psychologistId,
    required DateTime scheduledAt,
  }) =>
      _ds.bookConsultation(
        psychologistId: psychologistId,
        scheduledAt: scheduledAt,
      );

  @override
  Future<void> cancelConsultation(String id) => _ds.cancelConsultation(id);

  // ── Legacy helpers ───────────────────────────────────────────────────────

  @override
  Future<List<Consultation>> getUpcoming() async {
    try {
      final data = await _client
          .from('consultations')
          .select('*, psychologists(full_name, title, photo_url)')
          .inFilter('status', ['pending', 'confirmed', 'ongoing']).order(
              'scheduled_at');
      return data.map(ConsultationModel.fromJson).toList();
    } catch (e, st) {
      throwAppException('Gagal memuat konsultasi mendatang.', e, st);
    }
  }

  @override
  Future<List<Consultation>> getHistory() async {
    try {
      final data = await _client
          .from('consultations')
          .select('*, psychologists(full_name, title, photo_url)')
          .eq('status', 'completed')
          .order('scheduled_at', ascending: false)
          .limit(20);
      return data.map(ConsultationModel.fromJson).toList();
    } catch (e, st) {
      throwAppException('Gagal memuat riwayat konsultasi.', e, st);
    }
  }
}
