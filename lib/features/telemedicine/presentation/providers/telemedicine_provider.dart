import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../data/datasources/telemedicine_remote_datasource.dart';
import '../../data/repositories/telemedicine_repository_impl.dart';
import '../../domain/entities/consultation_entity.dart';
import '../../domain/entities/psychologist_entity.dart';
import '../../domain/entities/time_slot_entity.dart';

part 'telemedicine_provider.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Generated providers — keep signatures stable
// ─────────────────────────────────────────────────────────────────────────────

@riverpod
TelemedicineRepositoryImpl telemedicineRepository(Ref ref) =>
    TelemedicineRepositoryImpl(ref.watch(supabaseProvider));

@riverpod
Future<List<Consultation>> upcomingConsultations(Ref ref) =>
    ref.watch(telemedicineRepositoryProvider).getUpcoming();

// ─────────────────────────────────────────────────────────────────────────────
// Psychologist list — with search / filter / sort state
// ─────────────────────────────────────────────────────────────────────────────

class PsychologistListState {
  const PsychologistListState({
    this.psychologists = const AsyncValue.loading(),
    this.query = '',
    this.specialization,
    this.sort = PsychologistSort.rating,
  });

  final AsyncValue<List<Psychologist>> psychologists;
  final String query;
  final String? specialization;
  final PsychologistSort sort;

  PsychologistListState copyWith({
    AsyncValue<List<Psychologist>>? psychologists,
    String? query,
    Object? specialization = _sentinel,
    PsychologistSort? sort,
  }) =>
      PsychologistListState(
        psychologists: psychologists ?? this.psychologists,
        query: query ?? this.query,
        specialization: specialization == _sentinel
            ? this.specialization
            : specialization as String?,
        sort: sort ?? this.sort,
      );
}

const _sentinel = Object();

class PsychologistListNotifier extends StateNotifier<PsychologistListState> {
  PsychologistListNotifier(this._repo) : super(const PsychologistListState()) {
    load();
  }

  final TelemedicineRepositoryImpl _repo;
  Timer? _debounce;

  Future<void> load() async {
    state = state.copyWith(psychologists: const AsyncValue.loading());
    try {
      final list = await _repo.getPsychologists(
        query: state.query,
        specialization: state.specialization,
        sort: state.sort,
      );
      state = state.copyWith(psychologists: AsyncValue.data(list));
    } catch (e, st) {
      state = state.copyWith(psychologists: AsyncValue.error(e, st));
    }
  }

  void setQuery(String q) {
    state = state.copyWith(query: q);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), load);
  }

  void setSpecialization(String? s) {
    state = state.copyWith(specialization: s);
    load();
  }

  void setSort(PsychologistSort s) {
    state = state.copyWith(sort: s);
    load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}

final psychologistListProvider = StateNotifierProvider.autoDispose<
    PsychologistListNotifier, PsychologistListState>(
  (ref) => PsychologistListNotifier(ref.read(telemedicineRepositoryProvider)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Psychologist detail
// ─────────────────────────────────────────────────────────────────────────────

final psychologistDetailProvider =
    FutureProvider.autoDispose.family<Psychologist, String>(
  (ref, id) => ref.read(telemedicineRepositoryProvider).getPsychologistById(id),
);

// ─────────────────────────────────────────────────────────────────────────────
// Available time slots — keyed by (psychologistId, date)
// ─────────────────────────────────────────────────────────────────────────────

class AvailableSlotsKey {
  const AvailableSlotsKey(this.psychologistId, this.date);
  final String psychologistId;
  final DateTime date;

  @override
  bool operator ==(Object other) =>
      other is AvailableSlotsKey &&
      other.psychologistId == psychologistId &&
      other.date.year == date.year &&
      other.date.month == date.month &&
      other.date.day == date.day;

  @override
  int get hashCode =>
      Object.hash(psychologistId, date.year, date.month, date.day);
}

final availableSlotsProvider =
    FutureProvider.autoDispose.family<List<TimeSlot>, AvailableSlotsKey>(
  (ref, key) => ref
      .read(telemedicineRepositoryProvider)
      .getAvailableSlots(key.psychologistId, key.date),
);

// ─────────────────────────────────────────────────────────────────────────────
// User consultations
// ─────────────────────────────────────────────────────────────────────────────

final userConsultationsProvider =
    FutureProvider.autoDispose<List<Consultation>>(
  (ref) {
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return Future.value([]);
    return ref.read(telemedicineRepositoryProvider).getUserConsultations(uid);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Active consultation (set when a video call is joined)
// ─────────────────────────────────────────────────────────────────────────────

final activeConsultationProvider = StateProvider<Consultation?>((_) => null);

// ─────────────────────────────────────────────────────────────────────────────
// Booking state
// ─────────────────────────────────────────────────────────────────────────────

class BookingState {
  const BookingState({
    this.selectedDate,
    this.selectedSlot,
    this.isLoading = false,
    this.success = false,
    this.error,
    this.bookedConsultation,
  });

  final DateTime? selectedDate;
  final TimeSlot? selectedSlot;
  final bool isLoading;
  final bool success;
  final String? error;
  final Consultation? bookedConsultation;

  BookingState copyWith({
    Object? selectedDate = _sentinel,
    Object? selectedSlot = _sentinel,
    bool? isLoading,
    bool? success,
    Object? error = _sentinel,
    Object? bookedConsultation = _sentinel,
  }) =>
      BookingState(
        selectedDate: selectedDate == _sentinel
            ? this.selectedDate
            : selectedDate as DateTime?,
        selectedSlot: selectedSlot == _sentinel
            ? this.selectedSlot
            : selectedSlot as TimeSlot?,
        isLoading: isLoading ?? this.isLoading,
        success: success ?? this.success,
        error: error == _sentinel ? this.error : error as String?,
        bookedConsultation: bookedConsultation == _sentinel
            ? this.bookedConsultation
            : bookedConsultation as Consultation?,
      );
}

class BookingNotifier extends StateNotifier<BookingState> {
  BookingNotifier(this._repo, this._psychologistId)
      : super(BookingState(selectedDate: DateTime.now()));

  final TelemedicineRepositoryImpl _repo;
  final String _psychologistId;

  void selectDate(DateTime d) =>
      state = state.copyWith(selectedDate: d, selectedSlot: null);

  void selectSlot(TimeSlot s) => state = state.copyWith(selectedSlot: s);

  Future<void> book(Psychologist psychologist) async {
    final slot = state.selectedSlot;
    if (slot == null) return;
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) {
      state = state.copyWith(error: 'Silakan login ulang.');
      return;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      // Lama sesi dan tarif ditentukan server (book_consultation), bukan dikirim dari sini.
      final consultation = await _repo.bookConsultation(
        psychologistId: _psychologistId,
        scheduledAt: slot.startTime,
      );
      state = state.copyWith(
        isLoading: false,
        success: true,
        bookedConsultation: consultation,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: errorMessage(e, fallback: 'Gagal membuat janji. Coba lagi.'),
      );
    }
  }
}

final bookingProvider = StateNotifierProvider.autoDispose
    .family<BookingNotifier, BookingState, String>(
  (ref, psychologistId) =>
      BookingNotifier(ref.read(telemedicineRepositoryProvider), psychologistId),
);
