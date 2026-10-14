import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/app_exception.dart';
import '../../domain/entities/consultation_entity.dart';
import '../../domain/entities/psychologist_entity.dart';
import '../../domain/entities/time_slot_entity.dart';
import '../booking_rpc.dart';
import '../models/consultation_model.dart';
import '../models/psychologist_model.dart';

enum PsychologistSort { rating, cheapest, availableToday }

// Joined select used wherever consultation rows are fetched.
const _consultationSelect = '*, psychologists(full_name, title, photo_url)';

abstract class TelemedicineRemoteDatasource {
  Future<List<Psychologist>> getPsychologists({
    String query = '',
    String? specialization,
    PsychologistSort sort = PsychologistSort.rating,
  });
  Future<Psychologist> getPsychologistById(String id);
  Future<List<TimeSlot>> getAvailableSlots(
      String psychologistId, DateTime date);
  Future<List<Consultation>> getUserConsultations(String userId);

  /// Memesan lewat fungsi database `book_consultation`. Lama sesi (50 menit) dan tarif ditentukan SERVER,
  /// bukan dikirim aplikasi; kegagalan (bentrok, terlalu dekat, dst.) dilempar sebagai [AppException] berbahasa Indonesia.
  Future<Consultation> bookConsultation({
    required String psychologistId,
    required DateTime scheduledAt,
  });
  Future<void> cancelConsultation(String id);
}

class TelemedicineRemoteDatasourceImpl implements TelemedicineRemoteDatasource {
  const TelemedicineRemoteDatasourceImpl(this._client);

  final SupabaseClient _client;

  @override
  Future<List<Psychologist>> getPsychologists({
    String query = '',
    String? specialization,
    PsychologistSort sort = PsychologistSort.rating,
  }) async {
    try {
      var req = _client.from('psychologists').select();

      if (query.isNotEmpty) {
        req = req.ilike('full_name', '%$query%');
      }
      if (specialization != null && specialization.isNotEmpty) {
        req = req.contains('specializations', [specialization]);
      }
      if (sort == PsychologistSort.availableToday) {
        req = req.eq('is_available_now', true);
      }

      final orderCol = switch (sort) {
        PsychologistSort.rating => 'rating_average',
        PsychologistSort.cheapest => 'consultation_fee',
        PsychologistSort.availableToday => 'rating_average',
      };
      final ascending = sort == PsychologistSort.cheapest;

      final data = await req.order(orderCol, ascending: ascending);
      return data.map(PsychologistModel.fromJson).toList();
    } catch (e, st) {
      throwAppException('Gagal memuat daftar psikolog.', e, st);
    }
  }

  @override
  Future<Psychologist> getPsychologistById(String id) async {
    final data =
        await _client.from('psychologists').select().eq('id', id).single();
    return PsychologistModel.fromJson(data);
  }

  @override
  Future<List<TimeSlot>> getAvailableSlots(
    String psychologistId,
    DateTime date,
  ) async {
    try {
      final window = dayWindow(date);
      final data = await _client.rpc('psychologist_available_slots', params: {
        'p_psychologist': psychologistId,
        'p_from': window.from,
        'p_to': window.to,
      });
      return slotsFromRpc(psychologistId, data);
    } catch (e, st) {
      throwAppException('Gagal memuat jadwal psikolog.', e, st);
    }
  }

  @override
  Future<List<Consultation>> getUserConsultations(String userId) async {
    try {
      final data = await _client
          .from('consultations')
          .select(_consultationSelect)
          .eq('user_id', userId)
          .order('scheduled_at', ascending: false)
          .limit(50);
      return data.map(ConsultationModel.fromJson).toList();
    } catch (e, st) {
      throwAppException('Gagal memuat riwayat konsultasi.', e, st);
    }
  }

  @override
  Future<Consultation> bookConsultation({
    required String psychologistId,
    required DateTime scheduledAt,
  }) async {
    try {
      final result = await _client.rpc('book_consultation', params: {
        'p_psychologist': psychologistId,
        'p_scheduled_at': scheduledAt.toUtc().toIso8601String(),
      });
      final id = bookedConsultationId(result);
      if (id == null) {
        throw const FormatException(
            'book_consultation: bentuk hasil tak terduga');
      }
      final data = await _client
          .from('consultations')
          .select(_consultationSelect)
          .eq('id', id)
          .single();
      return ConsultationModel.fromJson(data);
    } catch (e, st) {
      // Kalimat ramah dari token galat database; pesan asli server tidak pernah sampai ke pengguna.
      throwAppException(bookingErrorMessage(e), e, st);
    }
  }

  @override
  Future<void> cancelConsultation(String id) async {
    await _client
        .from('consultations')
        .update({'status': 'cancelled'}).eq('id', id);
  }
}
