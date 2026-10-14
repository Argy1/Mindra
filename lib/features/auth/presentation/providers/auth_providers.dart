import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../data/repositories/supabase_auth_repository.dart';
import '../../domain/repositories/auth_repository.dart';

/// Provides the [AuthRepository] implementation backed by Supabase.
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return SupabaseAuthRepository(ref.watch(supabaseProvider));
});

/// Emits Supabase [AuthState] events (sign-in, sign-out, token refresh).
/// Use this to react globally to auth changes.
final authChangesProvider = StreamProvider<AuthState>((ref) {
  return ref.watch(supabaseProvider).auth.onAuthStateChange;
});

/// Synchronous read of the currently authenticated [User], or null.
final currentUserProvider = Provider<User?>((ref) {
  // Re-evaluates whenever auth state stream fires
  ref.watch(authChangesProvider);
  return ref.read(supabaseProvider).auth.currentUser;
});
