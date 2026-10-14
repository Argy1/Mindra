import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/entities/user_profile_entity.dart';
import '../../data/repositories/profile_repository_impl.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

part 'profile_provider.g.dart';

@riverpod
ProfileRepositoryImpl profileRepository(Ref ref) =>
    ProfileRepositoryImpl(ref.watch(supabaseProvider));

@riverpod
class ProfileNotifier extends _$ProfileNotifier {
  @override
  Future<UserProfileEntity?> build() async {
    ref.watch(authChangesProvider);
    final client = ref.watch(supabaseProvider);
    final user = client.auth.currentUser;
    if (user == null) return null;

    return ref.watch(profileRepositoryProvider).getOrCreateProfile(
          userId: user.id,
          email: user.email ?? '',
          fullName: user.userMetadata?['full_name'] as String?,
        );
  }

  Future<void> save(UserProfileEntity profile) async {
    await ref.read(profileRepositoryProvider).updateProfile(profile);
    ref.invalidateSelf();
  }
}
