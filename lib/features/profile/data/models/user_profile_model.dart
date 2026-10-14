import '../../domain/entities/user_profile_entity.dart';

class UserProfileModel extends UserProfileEntity {
  const UserProfileModel({
    required super.id,
    required super.email,
    required super.name,
    super.avatarUrl,
    super.dateOfBirth,
    super.gender,
    super.city,
    super.province,
    super.shareRegionStats,
    super.notificationsEnabled,
    super.reminderTime,
  });

  factory UserProfileModel.fromJson(Map<String, dynamic> j) => UserProfileModel(
        id: j['id'] as String,
        email: j['email'] as String,
        name: j['name'] as String? ?? 'Pengguna',
        avatarUrl: j['avatar_url'] as String?,
        dateOfBirth: j['date_of_birth'] != null
            ? DateTime.tryParse(j['date_of_birth'] as String)
            : null,
        gender: j['gender'] as String?,
        city: j['city'] as String?,
        province: j['domicile_province'] as String?,
        shareRegionStats: j['share_region_stats'] as bool? ?? false,
        notificationsEnabled: j['notifications_enabled'] as bool? ?? true,
        reminderTime: j['reminder_time'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'avatar_url': avatarUrl,
        'date_of_birth': dateOfBirth?.toIso8601String(),
        'gender': gender,
        'city': city,
        'domicile_province': province,
        'share_region_stats': shareRegionStats,
        'notifications_enabled': notificationsEnabled,
        'reminder_time': reminderTime,
      };
}
