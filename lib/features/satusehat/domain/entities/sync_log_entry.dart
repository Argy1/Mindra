/// The kind of FHIR resource a sync attempt targets.
enum SyncResourceType {
  patient,
  observation,
  encounter;

  /// FHIR resourceType string — also the value stored in `resource_type`.
  String get fhirType => switch (this) {
        SyncResourceType.patient => 'Patient',
        SyncResourceType.observation => 'Observation',
        SyncResourceType.encounter => 'Encounter',
      };

  static SyncResourceType fromFhirType(String value) =>
      SyncResourceType.values.firstWhere(
        (e) => e.fhirType == value,
        orElse: () => SyncResourceType.observation,
      );
}

/// Lifecycle of a single resource's sync to SATUSEHAT.
///
/// Mirrors the `sync_status` check constraint on `satusehat_sync_log`
/// (`pending` | `synced` | `failed`).
enum SyncStatus {
  /// Queued — not yet attempted, or waiting for a retry window.
  pending,

  /// Successfully accepted by SATUSEHAT.
  synced,

  /// All retries exhausted, or a non-retryable validation error.
  failed;

  static SyncStatus fromName(String name) => SyncStatus.values.firstWhere(
        (e) => e.name == name,
        orElse: () => SyncStatus.pending,
      );
}

/// A row of the `satusehat_sync_log` table — one local resource's sync state.
class SyncLogEntry {
  const SyncLogEntry({
    required this.id,
    required this.userId,
    required this.resourceType,
    required this.localRecordId,
    required this.status,
    required this.attemptCount,
    required this.createdAt,
    required this.updatedAt,
    this.satusehatId,
    this.errorMessage,
    this.retryAfter,
    this.syncedAt,
  });

  final String id;
  final String userId;
  final SyncResourceType resourceType;

  /// Primary key of the local Supabase row (assessment / consultation / user).
  final String localRecordId;
  final SyncStatus status;
  final int attemptCount;

  /// FHIR logical id returned by SATUSEHAT once synced.
  final String? satusehatId;
  final String? errorMessage;

  /// Earliest time the next attempt may run (backoff / Retry-After).
  final DateTime? retryAfter;
  final DateTime? syncedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory SyncLogEntry.fromJson(Map<String, dynamic> j) => SyncLogEntry(
        id: j['id'] as String,
        userId: j['user_id'] as String,
        resourceType: SyncResourceType.fromFhirType(
            j['resource_type'] as String? ?? ''),
        localRecordId: j['local_record_id'] as String,
        status: SyncStatus.fromName(j['sync_status'] as String? ?? 'pending'),
        attemptCount: j['attempt_count'] as int? ?? 0,
        satusehatId: j['satusehat_id'] as String?,
        errorMessage: j['error_message'] as String?,
        retryAfter: j['retry_after'] != null
            ? DateTime.tryParse(j['retry_after'] as String)
            : null,
        syncedAt: j['synced_at'] != null
            ? DateTime.tryParse(j['synced_at'] as String)
            : null,
        createdAt:
            DateTime.tryParse(j['created_at'] as String? ?? '') ??
                DateTime.now(),
        updatedAt:
            DateTime.tryParse(j['updated_at'] as String? ?? '') ??
                DateTime.now(),
      );
}
