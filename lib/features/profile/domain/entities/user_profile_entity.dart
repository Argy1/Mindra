class UserProfileEntity {
  const UserProfileEntity({
    required this.id,
    required this.email,
    required this.name,
    this.avatarUrl,
    this.dateOfBirth,
    this.gender,
    this.city,
    this.province,
    this.shareRegionStats = false,
    this.notificationsEnabled = true,
    this.reminderTime,
  });

  final String id;
  final String email;
  final String name;
  final String? avatarUrl;
  final DateTime? dateOfBirth;
  final String? gender;
  final String? city;

  /// Provinsi domisili (`profiles.domicile_province`), penulisan kanonik dari `kProvinces`.
  final String? province;

  /// Persetujuan EKSPLISIT ikut angka gabungan anonim wilayah (default mati; kolom `share_region_stats`).
  final bool shareRegionStats;
  final bool notificationsEnabled;
  final String? reminderTime;

  UserProfileEntity copyWith({
    String? name,
    String? avatarUrl,
    DateTime? dateOfBirth,
    String? gender,
    String? city,
    bool? notificationsEnabled,
    String? reminderTime,
  }) =>
      UserProfileEntity(
        id: id,
        email: email,
        name: name ?? this.name,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        dateOfBirth: dateOfBirth ?? this.dateOfBirth,
        gender: gender ?? this.gender,
        city: city ?? this.city,
        province: province,
        shareRegionStats: shareRegionStats,
        notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
        reminderTime: reminderTime ?? this.reminderTime,
      );

  /// Mengganti wilayah dan persetujuannya. Terpisah dari [copyWith] karena yang ini boleh MENGOSONGKAN kota dan provinsi
  /// (null = kosong), sedangkan copyWith memakai `??` dan tidak bisa menghapus nilai.
  UserProfileEntity withRegion({
    required String? city,
    required String? province,
    required bool shareRegionStats,
  }) =>
      UserProfileEntity(
        id: id,
        email: email,
        name: name,
        avatarUrl: avatarUrl,
        dateOfBirth: dateOfBirth,
        gender: gender,
        city: city,
        province: province,
        shareRegionStats: shareRegionStats,
        notificationsEnabled: notificationsEnabled,
        reminderTime: reminderTime,
      );
}
