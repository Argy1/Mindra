import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/constants/legal.dart';
import '../../../../core/providers/supabase_provider.dart';

part 'auth_provider.g.dart';

class AuthState {
  const AuthState({
    this.isLoading = false,
    this.error,
    this.user,
  });

  final bool isLoading;
  final String? error;
  final User? user;

  AuthState copyWith({bool? isLoading, String? error, User? user}) => AuthState(
        isLoading: isLoading ?? this.isLoading,
        error: error,
        user: user ?? this.user,
      );
}

@riverpod
class Auth extends _$Auth {
  @override
  AuthState build() {
    final supabase = ref.watch(supabaseProvider);
    return AuthState(user: supabase.auth.currentUser);
  }

  Future<bool> signIn({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ref
          .read(supabaseProvider)
          .auth
          .signInWithPassword(email: email, password: password);
      state = state.copyWith(isLoading: false, user: res.user);
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _mapError(e.message),
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Terjadi kesalahan. Coba lagi.',
      );
      return false;
    }
  }

  Future<bool> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ref.read(supabaseProvider).auth.signUp(
        email: email,
        password: password,
        data: {
          'full_name': name,
          'terms_version': kLegalVersion,
          'terms_accepted_at': DateTime.now().toUtc().toIso8601String(),
        },
      );
      state = state.copyWith(isLoading: false, user: res.user);
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _mapError(e.message),
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Terjadi kesalahan. Coba lagi.',
      );
      return false;
    }
  }

  Future<void> signOut() async {
    await ref.read(supabaseProvider).auth.signOut();
    state = const AuthState();
  }

  String _mapError(String msg) {
    if (msg.contains('Invalid login')) {
      return 'Email atau kata sandi tidak sesuai.';
    }
    if (msg.contains('already registered')) {
      return 'Email sudah terdaftar. Coba masuk.';
    }
    if (msg.contains('Password should be')) {
      return 'Kata sandi minimal 6 karakter.';
    }
    if (msg.contains('Unable to validate')) {
      return 'Email tidak valid.';
    }
    return 'Terjadi kesalahan. Coba lagi.';
  }
}
