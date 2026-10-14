import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../data/repositories/caregiver_repository_impl.dart';
import '../../domain/entities/caregiver_entity.dart';

part 'caregiver_provider.g.dart';

final caregiverRepositoryProvider = Provider<CaregiverRepositoryImpl>(
  (ref) => CaregiverRepositoryImpl(ref.watch(supabaseProvider)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Patient-side: manage your caregivers
// ─────────────────────────────────────────────────────────────────────────────

class PatientCaregiverState {
  const PatientCaregiverState({
    this.relationships = const [],
    this.isLoading = false,
    this.error,
    this.pendingInviteCode,
  });

  final List<CaregiverRelationship> relationships;
  final bool isLoading;
  final String? error;
  final String? pendingInviteCode;

  PatientCaregiverState copyWith({
    List<CaregiverRelationship>? relationships,
    bool? isLoading,
    String? error,
    Object? pendingInviteCode = _sentinel,
  }) =>
      PatientCaregiverState(
        relationships: relationships ?? this.relationships,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        pendingInviteCode: pendingInviteCode == _sentinel
            ? this.pendingInviteCode
            : pendingInviteCode as String?,
      );
}

const _sentinel = Object();

class PatientCaregiverNotifier extends StateNotifier<PatientCaregiverState> {
  PatientCaregiverNotifier(this._repo) : super(const PatientCaregiverState());

  final CaregiverRepositoryImpl _repo;

  Future<void> load(String patientId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final list = await _repo.getRelationshipsAsPatient(patientId);
      state = PatientCaregiverState(relationships: list);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: errorMessage(e, fallback: 'Gagal memuat daftar caregiver.'),
      );
    }
  }

  Future<void> invite({
    required String patientId,
    required String phone,
    required CaregiverPermissions permissions,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final rel = await _repo.inviteCaregiver(
        patientId: patientId,
        caregiverPhone: phone,
        permissions: permissions,
      );
      state = state.copyWith(
        isLoading: false,
        relationships: [rel, ...state.relationships],
        pendingInviteCode: rel.inviteCode,
      );
    } catch (e) {
      state =
          state.copyWith(isLoading: false, error: 'Gagal mengirim undangan.');
    }
  }

  Future<void> updatePermissions(
      String relationshipId, CaregiverPermissions permissions) async {
    state = state.copyWith(error: null);
    try {
      await _repo.updatePermissions(relationshipId, permissions);
      state = state.copyWith(
        relationships: state.relationships.map((r) {
          if (r.id == relationshipId) {
            return CaregiverRelationshipModel2(r, permissions);
          }
          return r;
        }).toList(),
      );
    } catch (e) {
      state = state.copyWith(
        error: errorMessage(e, fallback: 'Gagal memperbarui izin caregiver.'),
      );
    }
  }

  Future<void> remove(String relationshipId) async {
    state = state.copyWith(error: null);
    try {
      await _repo.removeCaregiver(relationshipId);
      state = state.copyWith(
        relationships:
            state.relationships.where((r) => r.id != relationshipId).toList(),
      );
    } catch (e) {
      state = state.copyWith(
        error: errorMessage(e, fallback: 'Gagal menghapus caregiver.'),
      );
    }
  }

  void clearInviteCode() => state = state.copyWith(pendingInviteCode: null);
}

// Simple wrapper to copy a relationship with updated permissions
class CaregiverRelationshipModel2 extends CaregiverRelationship {
  CaregiverRelationshipModel2(
      CaregiverRelationship src, CaregiverPermissions perms)
      : super(
          id: src.id,
          patientId: src.patientId,
          caregiverId: src.caregiverId,
          inviteCode: src.inviteCode,
          status: src.status,
          permissions: perms,
          caregiverPhone: src.caregiverPhone,
          patientName: src.patientName,
          caregiverName: src.caregiverName,
          createdAt: src.createdAt,
        );
}

final patientCaregiverProvider = StateNotifierProvider.autoDispose<
    PatientCaregiverNotifier, PatientCaregiverState>(
  (ref) => PatientCaregiverNotifier(ref.watch(caregiverRepositoryProvider)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Caregiver-side: list patients + accept invites
// ─────────────────────────────────────────────────────────────────────────────

class CaregiverPatientsState {
  const CaregiverPatientsState({
    this.relationships = const [],
    this.isLoading = false,
    this.error,
  });

  final List<CaregiverRelationship> relationships;
  final bool isLoading;
  final String? error;

  CaregiverPatientsState copyWith({
    List<CaregiverRelationship>? relationships,
    bool? isLoading,
    String? error,
  }) =>
      CaregiverPatientsState(
        relationships: relationships ?? this.relationships,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class CaregiverPatientsNotifier extends StateNotifier<CaregiverPatientsState> {
  CaregiverPatientsNotifier(this._repo) : super(const CaregiverPatientsState());

  final CaregiverRepositoryImpl _repo;

  Future<void> load(String caregiverId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final list = await _repo.getRelationshipsAsCaregiver(caregiverId);
      state = CaregiverPatientsState(relationships: list);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: errorMessage(e, fallback: 'Gagal memuat daftar pasien.'),
      );
    }
  }

  Future<bool> acceptInvite(String code, String caregiverId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final rel = await _repo.acceptInvite(
          inviteCode: code.trim().toUpperCase(), caregiverId: caregiverId);
      if (rel == null) {
        state = state.copyWith(
            isLoading: false, error: 'Kode tidak valid atau sudah kadaluarsa.');
        return false;
      }
      state = state.copyWith(
          isLoading: false, relationships: [rel, ...state.relationships]);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: errorMessage(e, fallback: 'Gagal memproses kode undangan.'),
      );
      return false;
    }
  }
}

final caregiverPatientsProvider = StateNotifierProvider.autoDispose<
    CaregiverPatientsNotifier, CaregiverPatientsState>(
  (ref) => CaregiverPatientsNotifier(ref.watch(caregiverRepositoryProvider)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Patient summary (per patient, for dashboard)
// ─────────────────────────────────────────────────────────────────────────────

class PatientSummaryNotifier
    extends StateNotifier<AsyncValue<PatientSummary?>> {
  PatientSummaryNotifier(this._repo) : super(const AsyncValue.loading());

  final CaregiverRepositoryImpl _repo;

  Future<void> load(String patientId, CaregiverPermissions permissions) async {
    state = const AsyncValue.loading();
    try {
      final summary = await _repo.getPatientSummary(patientId, permissions);
      state = AsyncValue.data(summary);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final patientSummaryProvider = StateNotifierProvider.autoDispose
    .family<PatientSummaryNotifier, AsyncValue<PatientSummary?>, String>(
  (ref, patientId) =>
      PatientSummaryNotifier(ref.watch(caregiverRepositoryProvider)),
);
