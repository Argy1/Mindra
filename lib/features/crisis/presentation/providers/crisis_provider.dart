import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/providers/supabase_provider.dart';
import '../../data/repositories/crisis_repository_impl.dart';
import '../../domain/entities/crisis_resource_entity.dart';
import '../../domain/entities/emergency_contact_entity.dart';

part 'crisis_provider.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Generated providers — keep signatures stable
// ─────────────────────────────────────────────────────────────────────────────

@riverpod
Future<List<CrisisResource>> crisisResources(Ref ref) =>
    CrisisRepositoryImpl(ref.watch(supabaseProvider)).getResources();

// ─────────────────────────────────────────────────────────────────────────────
// Emergency contacts — user-managed list with add/edit/delete
// ─────────────────────────────────────────────────────────────────────────────

final crisisRepositoryProvider = Provider.autoDispose<CrisisRepositoryImpl>(
  (ref) => CrisisRepositoryImpl(ref.watch(supabaseProvider)),
);

final emergencyContactsProvider =
    FutureProvider.autoDispose<List<EmergencyContact>>((ref) {
  final uid = Supabase.instance.client.auth.currentUser?.id;
  if (uid == null) return Future.value([]);
  return ref.read(crisisRepositoryProvider).getEmergencyContacts(uid);
});

class EmergencyContactsNotifier extends StateNotifier<AsyncValue<void>> {
  EmergencyContactsNotifier(this._repo, this._ref)
      : super(const AsyncValue.data(null));

  final CrisisRepositoryImpl _repo;
  final Ref _ref;

  Future<bool> add({
    required String name,
    required String phone,
    required ContactRelationship relationship,
    required bool isPrimary,
  }) async {
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) {
      state = AsyncValue.error('Silakan login ulang.', StackTrace.current);
      return false;
    }
    state = const AsyncValue.loading();
    try {
      await _repo.addEmergencyContact(
        userId: uid,
        name: name,
        phone: phone,
        relationship: relationship,
        isPrimary: isPrimary,
      );
      _ref.invalidate(emergencyContactsProvider);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> update(EmergencyContact contact) async {
    state = const AsyncValue.loading();
    try {
      await _repo.updateEmergencyContact(contact);
      _ref.invalidate(emergencyContactsProvider);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> delete(String id) async {
    state = const AsyncValue.loading();
    try {
      await _repo.deleteEmergencyContact(id);
      _ref.invalidate(emergencyContactsProvider);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }
}

final emergencyContactsControllerProvider = StateNotifierProvider.autoDispose<
    EmergencyContactsNotifier, AsyncValue<void>>(
  (ref) => EmergencyContactsNotifier(
    ref.read(crisisRepositoryProvider),
    ref,
  ),
);
