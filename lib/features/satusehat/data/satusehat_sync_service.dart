import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/services/satusehat_service.dart';
import '../../assessment/data/assessment_repository.dart';
import '../../profile/data/models/user_profile_model.dart';
import '../../telemedicine/domain/entities/consultation_entity.dart';
import '../domain/entities/sync_log_entry.dart';
import 'fhir_mappers.dart';

/// Result of a sync attempt for a single resource.
class SyncOutcome {
  const SyncOutcome({
    required this.status,
    this.fhirId,
    this.message,
    this.queuedForRetry = false,
  });

  final SyncStatus status;
  final String? fhirId;
  final String? message;

  /// True when the attempt failed transiently and was re-queued.
  final bool queuedForRetry;

  bool get isSuccess => status == SyncStatus.synced;

  factory SyncOutcome.success(String? fhirId) =>
      SyncOutcome(status: SyncStatus.synced, fhirId: fhirId);

  factory SyncOutcome.queued(String message) => SyncOutcome(
        status: SyncStatus.pending,
        message: message,
        queuedForRetry: true,
      );

  factory SyncOutcome.failed(String message) =>
      SyncOutcome(status: SyncStatus.failed, message: message);
}

/// Orchestrates syncing local Mindra records to SATUSEHAT as FHIR resources.
///
/// - Resolves dependencies (an Observation/Encounter needs a synced Patient).
/// - Persists every attempt to `satusehat_sync_log`.
/// - Retries transient failures with exponential backoff.
/// - Treats validation errors as non-retryable (they indicate a mapping bug).
class SatusehatSyncService {
  SatusehatSyncService({
    required SupabaseClient client,
    required SatusehatService api,
    required String organizationId,
  })  : _db = client,
        _api = api,
        _organizationId = organizationId;

  final SupabaseClient _db;
  final SatusehatService _api;
  final String _organizationId;

  static const _maxAttempts = 5;
  static const _table = 'satusehat_sync_log';

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /// Syncs one assessment result as a FHIR Observation.
  /// Ensures the user's Patient resource exists first.
  Future<SyncOutcome> syncAssessmentResult(String assessmentId) async {
    final row = await _fetchRow('assessments', assessmentId);
    if (row == null) {
      return SyncOutcome.failed('Data asesmen tidak ditemukan.');
    }
    final result = AssessmentResult.fromJson(row);

    final existing =
        await checkSyncStatus(SyncResourceType.observation, assessmentId);
    if (existing?.status == SyncStatus.synced) {
      return SyncOutcome.success(existing!.satusehatId);
    }

    // Dependency: the Patient resource must be synced first.
    final patientFhirId = await _ensurePatientSynced(result.userId);
    if (patientFhirId == null) {
      return _recordFailure(
        resourceType: SyncResourceType.observation,
        userId: result.userId,
        localId: assessmentId,
        message: 'Patient SATUSEHAT belum tersedia. Akan dicoba lagi.',
      );
    }

    final payload = FhirMappers.observationFromAssessment(
      result,
      patientFhirId: patientFhirId,
    );

    return _post(
      resourceType: SyncResourceType.observation,
      userId: result.userId,
      localId: assessmentId,
      payload: payload,
      onSuccess: (fhirId) async {
        await _db.from('assessments').update({
          'sent_to_satusehat': true,
          'satusehat_observation_id': fhirId,
        }).eq('id', assessmentId);
      },
    );
  }

  /// Syncs one consultation as a FHIR Encounter.
  Future<SyncOutcome> syncConsultation(String consultationId) async {
    final row = await _fetchRow('consultations', consultationId);
    if (row == null) {
      return SyncOutcome.failed('Data konsultasi tidak ditemukan.');
    }
    final consultation = _consultationFromRow(row);

    final existing =
        await checkSyncStatus(SyncResourceType.encounter, consultationId);
    if (existing?.status == SyncStatus.synced) {
      return SyncOutcome.success(existing!.satusehatId);
    }

    final patientFhirId = await _ensurePatientSynced(consultation.userId);
    if (patientFhirId == null) {
      return _recordFailure(
        resourceType: SyncResourceType.encounter,
        userId: consultation.userId,
        localId: consultationId,
        message: 'Patient SATUSEHAT belum tersedia. Akan dicoba lagi.',
      );
    }

    final payload = FhirMappers.encounterFromConsultation(
      consultation,
      patientFhirId: patientFhirId,
      organizationId: _organizationId,
    );

    return _post(
      resourceType: SyncResourceType.encounter,
      userId: consultation.userId,
      localId: consultationId,
      payload: payload,
    );
  }

  /// Returns the current sync-log entry for a local resource, or null.
  Future<SyncLogEntry?> checkSyncStatus(
    SyncResourceType resourceType,
    String localId,
  ) async {
    try {
      final rows = await _db
          .from(_table)
          .select()
          .eq('resource_type', resourceType.fhirType)
          .eq('local_record_id', localId)
          .limit(1);
      if (rows.isEmpty) return null;
      return SyncLogEntry.fromJson(rows.first);
    } catch (e, st) {
      throwAppException(
          'Gagal memeriksa status sinkronisasi SATUSEHAT.', e, st);
    }
  }

  /// Re-attempts every queued sync whose retry window has elapsed.
  /// Call on app start / when connectivity is regained.
  Future<void> retryPendingSyncs(String userId) async {
    List<SyncLogEntry> pending;
    try {
      final rows = await _db
          .from(_table)
          .select()
          .eq('user_id', userId)
          .eq('sync_status', SyncStatus.pending.name);
      pending = rows.map(SyncLogEntry.fromJson).toList();
    } catch (e, st) {
      throwAppException('Gagal memuat antrean sinkronisasi SATUSEHAT.', e, st);
    }

    final now = DateTime.now();
    for (final entry in pending) {
      // Honour the backoff / Retry-After window.
      if (entry.retryAfter != null && now.isBefore(entry.retryAfter!)) {
        continue;
      }
      switch (entry.resourceType) {
        case SyncResourceType.observation:
          await syncAssessmentResult(entry.localRecordId);
        case SyncResourceType.encounter:
          await syncConsultation(entry.localRecordId);
        case SyncResourceType.patient:
          await _ensurePatientSynced(entry.userId);
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Patient dependency
  // ───────────────────────────────────────────────────────────────────────────

  /// Returns the SATUSEHAT Patient logical id for [userId], syncing the
  /// Patient resource on first use. Returns null if it cannot be resolved.
  Future<String?> _ensurePatientSynced(String userId) async {
    final existing = await checkSyncStatus(SyncResourceType.patient, userId);
    if (existing?.status == SyncStatus.synced &&
        existing?.satusehatId != null) {
      return existing!.satusehatId;
    }

    final profileRow = await _fetchRow('profiles', userId);
    if (profileRow == null) return null;

    final profile = UserProfileModel.fromJson(profileRow);
    // NIK is required by SATUSEHAT. It is stored encrypted at the app layer;
    // decryption happens before this point in production. In mock mode a
    // placeholder is used so development flows still work.
    final nik = (profileRow['nik_encrypted'] as String?)?.trim() ?? '';
    if (nik.isEmpty && !_api.isMockMode) {
      await _recordFailure(
        resourceType: SyncResourceType.patient,
        userId: userId,
        localId: userId,
        message: 'NIK belum diisi pada profil. Wajib untuk SATUSEHAT.',
        nonRetryable: true,
      );
      return null;
    }

    final payload = FhirMappers.patientFromProfile(
      profile,
      nik: nik.isEmpty ? '0000000000000000' : nik,
      province: profileRow['domicile_province'] as String?,
    );

    final outcome = await _post(
      resourceType: SyncResourceType.patient,
      userId: userId,
      localId: userId,
      payload: payload,
    );
    return outcome.fhirId;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Core post + logging
  // ───────────────────────────────────────────────────────────────────────────

  Future<SyncOutcome> _post({
    required SyncResourceType resourceType,
    required String userId,
    required String localId,
    required Map<String, dynamic> payload,
    Future<void> Function(String fhirId)? onSuccess,
  }) async {
    final prior = await checkSyncStatus(resourceType, localId);
    final attempt = (prior?.attemptCount ?? 0) + 1;

    final resp = await _api.createResource(resourceType.fhirType, payload);

    if (resp.success) {
      await _upsertLog(
        resourceType: resourceType,
        userId: userId,
        localId: localId,
        status: SyncStatus.synced,
        attemptCount: attempt,
        satusehatId: resp.fhirId,
        syncedAt: DateTime.now(),
      );
      if (resp.fhirId != null && onSuccess != null) {
        await onSuccess(resp.fhirId!);
      }
      return SyncOutcome.success(resp.fhirId);
    }

    // Validation failure — non-retryable. Recorded for engineering review.
    if (resp.errorKind == SatusehatErrorKind.validation) {
      await _upsertLog(
        resourceType: resourceType,
        userId: userId,
        localId: localId,
        status: SyncStatus.failed,
        attemptCount: attempt,
        errorMessage: resp.errorMessage,
      );
      // ignore: avoid_print
      print('[SATUSEHAT][VALIDATION] ${resourceType.fhirType}/$localId — '
          '${resp.errorMessage}');
      return SyncOutcome.failed(
          'Data ditolak SATUSEHAT. Tim teknis telah dicatat.');
    }

    // Retryable failure — queue with backoff (or give up after max attempts).
    return _recordFailure(
      resourceType: resourceType,
      userId: userId,
      localId: localId,
      message: resp.errorMessage ?? 'Gagal sinkronisasi.',
      attempt: attempt,
      rateLimitDelay: resp.retryAfter,
    );
  }

  Future<SyncOutcome> _recordFailure({
    required SyncResourceType resourceType,
    required String userId,
    required String localId,
    required String message,
    int? attempt,
    Duration? rateLimitDelay,
    bool nonRetryable = false,
  }) async {
    final prior = await checkSyncStatus(resourceType, localId);
    final attemptCount = attempt ?? (prior?.attemptCount ?? 0) + 1;

    if (nonRetryable || attemptCount >= _maxAttempts) {
      await _upsertLog(
        resourceType: resourceType,
        userId: userId,
        localId: localId,
        status: SyncStatus.failed,
        attemptCount: attemptCount,
        errorMessage:
            nonRetryable ? message : '$message (batas percobaan tercapai)',
      );
      return SyncOutcome.failed(message);
    }

    // Rate-limit honours Retry-After; otherwise exponential backoff.
    final delay = rateLimitDelay ?? _backoff(attemptCount);
    await _upsertLog(
      resourceType: resourceType,
      userId: userId,
      localId: localId,
      status: SyncStatus.pending,
      attemptCount: attemptCount,
      errorMessage: message,
      retryAfter: DateTime.now().add(delay),
    );
    return SyncOutcome.queued(message);
  }

  /// Exponential backoff: 2, 4, 8, 16 … seconds, capped at 1 hour.
  Duration _backoff(int attempt) {
    final seconds = (1 << attempt).clamp(2, 3600);
    return Duration(seconds: seconds);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Supabase helpers
  // ───────────────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>?> _fetchRow(String table, String id) async {
    try {
      return await _db.from(table).select().eq('id', id).maybeSingle();
    } catch (e, st) {
      throwAppException('Gagal memuat data $table untuk SATUSEHAT.', e, st);
    }
  }

  /// Builds the minimal [Consultation] the Encounter mapper needs from a raw
  /// `consultations` row, decoupled from the telemedicine data model.
  Consultation _consultationFromRow(Map<String, dynamic> row) {
    final statusStr = row['status'] as String? ?? 'pending';
    final status = switch (statusStr) {
      'confirmed' => ConsultationStatus.confirmed,
      'ongoing' => ConsultationStatus.ongoing,
      'completed' => ConsultationStatus.completed,
      'cancelled' => ConsultationStatus.cancelled,
      _ => ConsultationStatus.pending,
    };
    return Consultation(
      id: row['id'] as String,
      userId: row['user_id'] as String,
      psychologistId: row['psychologist_id'] as String? ?? '',
      scheduledAt: DateTime.tryParse(row['scheduled_at'] as String? ?? '') ??
          DateTime.now(),
      status: status,
      durationMinutes: row['duration_minutes'] as int? ?? 50,
    );
  }

  Future<void> _upsertLog({
    required SyncResourceType resourceType,
    required String userId,
    required String localId,
    required SyncStatus status,
    required int attemptCount,
    String? satusehatId,
    String? errorMessage,
    DateTime? retryAfter,
    DateTime? syncedAt,
  }) async {
    final values = {
      'user_id': userId,
      'resource_type': resourceType.fhirType,
      'local_record_id': localId,
      'sync_status': status.name,
      'attempt_count': attemptCount,
      'satusehat_id': satusehatId,
      'error_message': errorMessage,
      'retry_after': retryAfter?.toIso8601String(),
      'synced_at': syncedAt?.toIso8601String(),
    };

    try {
      final existing = await checkSyncStatus(resourceType, localId);
      if (existing != null) {
        await _db.from(_table).update(values).eq('id', existing.id);
      } else {
        await _db.from(_table).insert(values);
      }
    } catch (e) {
      debugPrint('Gagal menulis log sinkronisasi SATUSEHAT: $e');
    }
  }
}
