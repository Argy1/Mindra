/// Domain entity for an authenticated user.
/// This is independent of any data source (Supabase, Firebase, etc.).
class UserEntity {
  const UserEntity({
    required this.id,
    required this.email,
    this.fullName,
    this.isOnboarded = false,
  });

  final String id;
  final String email;
  final String? fullName;
  final bool isOnboarded;

  UserEntity copyWith({
    String? fullName,
    bool? isOnboarded,
  }) =>
      UserEntity(
        id: id,
        email: email,
        fullName: fullName ?? this.fullName,
        isOnboarded: isOnboarded ?? this.isOnboarded,
      );
}
