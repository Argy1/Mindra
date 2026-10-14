import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../../../core/services/satusehat_service.dart';
import '../../data/satusehat_sync_service.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Services
// ─────────────────────────────────────────────────────────────────────────────

final satusehatServiceProvider = Provider<SatusehatService>((ref) {
  final service = SatusehatService(
    baseUrl: AppConstants.satusehatBaseUrl,
    clientId: AppConstants.satusehatClientId,
    clientSecret: AppConstants.satusehatClientSecret,
  );
  ref.onDispose(service.dispose);
  return service;
});

final satusehatSyncServiceProvider = Provider<SatusehatSyncService>((ref) {
  return SatusehatSyncService(
    client: ref.watch(supabaseProvider),
    api: ref.watch(satusehatServiceProvider),
    organizationId: AppConstants.satusehatOrganizationId,
  );
});

/// True when SATUSEHAT credentials are absent — the service runs in mock mode.
final satusehatMockModeProvider = Provider<bool>(
  (ref) => ref.watch(satusehatServiceProvider).isMockMode,
);

// ─────────────────────────────────────────────────────────────────────────────
// Consent state — persisted in SharedPreferences
// ─────────────────────────────────────────────────────────────────────────────

class SatusehatConsentState {
  const SatusehatConsentState({
    required this.granted,
    this.grantedDate,
  });

  final bool granted;
  final DateTime? grantedDate;
}

class SatusehatConsentController
    extends StateNotifier<SatusehatConsentState> {
  SatusehatConsentController()
      : super(const SatusehatConsentState(granted: false)) {
    _load();
  }

  static const _grantedKey = 'satusehat_consent_granted';
  static const _dateKey = 'satusehat_consent_date';

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final granted = prefs.getBool(_grantedKey) ?? false;
    final dateStr = prefs.getString(_dateKey);
    state = SatusehatConsentState(
      granted: granted,
      grantedDate: dateStr != null ? DateTime.tryParse(dateStr) : null,
    );
  }

  Future<void> grant() async {
    final now = DateTime.now();
    state = SatusehatConsentState(granted: true, grantedDate: now);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_grantedKey, true);
    await prefs.setString(_dateKey, now.toIso8601String());
  }

  /// Revokes consent. Also disables auto-sync (handled by the caller).
  Future<void> revoke() async {
    state = const SatusehatConsentState(granted: false);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_grantedKey, false);
    await prefs.remove(_dateKey);
  }
}

final satusehatConsentProvider = StateNotifierProvider<
    SatusehatConsentController, SatusehatConsentState>(
  (_) => SatusehatConsentController(),
);

// ─────────────────────────────────────────────────────────────────────────────
// Auto-sync toggle — persisted in SharedPreferences
// ─────────────────────────────────────────────────────────────────────────────

class SatusehatAutoSyncController extends StateNotifier<bool> {
  SatusehatAutoSyncController() : super(false) {
    _load();
  }

  static const _key = 'satusehat_auto_sync';

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = prefs.getBool(_key) ?? false;
  }

  Future<void> setEnabled(bool enabled) async {
    state = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, enabled);
  }
}

final satusehatAutoSyncProvider =
    StateNotifierProvider<SatusehatAutoSyncController, bool>(
  (_) => SatusehatAutoSyncController(),
);

// ─────────────────────────────────────────────────────────────────────────────
// Manual sync action — used by the consent screen's "Setuju & Kirim Data"
// ─────────────────────────────────────────────────────────────────────────────

class SatusehatSyncController extends StateNotifier<AsyncValue<void>> {
  SatusehatSyncController(this._ref)
      : super(const AsyncValue.data(null));

  final Ref _ref;

  /// Syncs all of the current user's not-yet-synced assessments + consultations.
  Future<void> syncAll() async {
    state = const AsyncValue.loading();
    try {
      final db = _ref.read(supabaseProvider);
      final sync = _ref.read(satusehatSyncServiceProvider);
      final uid = Supabase.instance.client.auth.currentUser?.id;
      if (uid == null) {
        state = AsyncValue.error('Belum login.', StackTrace.current);
        return;
      }

      final assessments = await db
          .from('assessments')
          .select('id')
          .eq('user_id', uid)
          .eq('sent_to_satusehat', false);
      for (final row in assessments) {
        await sync.syncAssessmentResult(row['id'] as String);
      }

      final consultations = await db
          .from('consultations')
          .select('id')
          .eq('user_id', uid)
          .eq('status', 'completed');
      for (final row in consultations) {
        await sync.syncConsultation(row['id'] as String);
      }

      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Re-runs queued retries (e.g. on app start).
  Future<void> retryPending() async {
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return;
    await _ref.read(satusehatSyncServiceProvider).retryPendingSyncs(uid);
  }
}

final satusehatSyncControllerProvider = StateNotifierProvider<
    SatusehatSyncController, AsyncValue<void>>(
  (ref) => SatusehatSyncController(ref),
);
