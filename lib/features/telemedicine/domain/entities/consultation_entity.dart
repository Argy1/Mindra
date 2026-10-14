/// Mirrors the `status` check constraint in the `consultations` table:
/// `('pending','confirmed','ongoing','completed','cancelled')`
enum ConsultationStatus { pending, confirmed, ongoing, completed, cancelled }

class Consultation {
  const Consultation({
    required this.id,
    required this.userId,
    required this.psychologistId,
    required this.scheduledAt,
    required this.status,
    this.psychologistName = '',
    this.psychologistPhotoUrl,
    this.psychologistTitle,
    this.agoraChannelName,
    this.durationMinutes = 50,
    this.bookingFee = 0,
  });

  final String id;
  final String userId;

  /// Foreign key to `psychologists.id` — DB column `psychologist_id`.
  final String psychologistId;
  final DateTime scheduledAt;
  final ConsultationStatus status;

  /// Populated via a JOIN on `psychologists.full_name`.
  final String psychologistName;

  /// Populated via a JOIN on `psychologists.photo_url`.
  final String? psychologistPhotoUrl;

  /// Populated via a JOIN on `psychologists.title`.
  final String? psychologistTitle;

  /// DB column `agora_channel_name`.
  final String? agoraChannelName;

  final int durationMinutes;

  /// DB column `booking_fee`.
  final int bookingFee;

  Consultation copyWith({
    String? id,
    String? userId,
    String? psychologistId,
    DateTime? scheduledAt,
    ConsultationStatus? status,
    String? psychologistName,
    String? psychologistPhotoUrl,
    String? psychologistTitle,
    String? agoraChannelName,
    int? durationMinutes,
    int? bookingFee,
  }) =>
      Consultation(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        psychologistId: psychologistId ?? this.psychologistId,
        scheduledAt: scheduledAt ?? this.scheduledAt,
        status: status ?? this.status,
        psychologistName: psychologistName ?? this.psychologistName,
        psychologistPhotoUrl: psychologistPhotoUrl ?? this.psychologistPhotoUrl,
        psychologistTitle: psychologistTitle ?? this.psychologistTitle,
        agoraChannelName: agoraChannelName ?? this.agoraChannelName,
        durationMinutes: durationMinutes ?? this.durationMinutes,
        bookingFee: bookingFee ?? this.bookingFee,
      );
}
