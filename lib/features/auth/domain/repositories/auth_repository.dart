import '../entities/user_entity.dart';

/// Contract for all authentication operations.
abstract class AuthRepository {
  /// Emits [UserEntity] when signed in, null when signed out.
  Stream<UserEntity?> get authStateChanges;

  /// Synchronous read of the currently signed-in user.
  UserEntity? get currentUser;

  Future<UserEntity> signIn({
    required String email,
    required String password,
  });

  Future<UserEntity> signUp({
    required String email,
    required String password,
    String? fullName,
  });

  Future<void> signOut();

  Future<void> resetPassword(String email);
}
