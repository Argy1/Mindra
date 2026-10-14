import '../entities/user_profile_entity.dart';

abstract class ProfileRepository {
  Future<UserProfileEntity?> getProfile(String userId);
  Future<void> updateProfile(UserProfileEntity profile);
  Future<String?> uploadAvatar(String userId, String filePath);
  Future<void> deleteAccount({required String email, required String password});
}
