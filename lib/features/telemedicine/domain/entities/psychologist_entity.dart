class Psychologist {
  const Psychologist({
    required this.id,
    required this.name,
    required this.title,
    required this.photoUrl,
    required this.rating,
    required this.reviewCount,
    required this.specializations,
    required this.bio,
    required this.pricePerSession,
    required this.isAvailableNow,
    required this.isHimpsiVerified,
    this.licenseNumber,
  });

  final String id;

  /// Display name — mapped from DB column `full_name`.
  final String name;
  final String title;
  final String photoUrl;

  /// Mapped from DB column `rating_average`.
  final double rating;

  /// Mapped from DB column `total_reviews`.
  final int reviewCount;
  final List<String> specializations;
  final String bio;

  /// Mapped from DB column `consultation_fee`.
  final int pricePerSession;

  /// Mapped from DB column `is_available_now`.
  final bool isAvailableNow;

  /// Mapped from DB column `himpsi_verified`.
  final bool isHimpsiVerified;
  final String? licenseNumber;
}
