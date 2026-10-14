import '../../domain/entities/consultation_entity.dart';

class ConsultationModel extends Consultation {
  const ConsultationModel({
    required super.id,
    required super.userId,
    required super.psychologistId,
    required super.scheduledAt,
    required super.status,
    super.psychologistName,
    super.psychologistPhotoUrl,
    super.psychologistTitle,
    super.agoraChannelName,
    super.durationMinutes,
    super.bookingFee,
  });

  factory ConsultationModel.fromJson(Map<String, dynamic> j) {
    // Support rows that include a psychologists join:
    // .select('*, psychologists(full_name, title, photo_url)')
    final psych = j['psychologists'] as Map<String, dynamic>?;

    return ConsultationModel(
      id: j['id'] as String,
      userId: j['user_id'] as String,
      psychologistId: j['psychologist_id'] as String,
      scheduledAt: DateTime.parse(j['scheduled_at'] as String),
      status: _parseStatus(j['status'] as String? ?? 'pending'),
      psychologistName: psych?['full_name'] as String? ?? '',
      psychologistPhotoUrl: psych?['photo_url'] as String?,
      psychologistTitle: psych?['title'] as String?,
      agoraChannelName: j['agora_channel_name'] as String?,
      durationMinutes: j['duration_minutes'] as int? ?? 50,
      bookingFee: j['booking_fee'] as int? ?? 0,
    );
  }

  static ConsultationStatus _parseStatus(String s) => switch (s) {
        'confirmed' => ConsultationStatus.confirmed,
        'ongoing' => ConsultationStatus.ongoing,
        'completed' => ConsultationStatus.completed,
        'cancelled' => ConsultationStatus.cancelled,
        _ => ConsultationStatus.pending,
      };

  Map<String, dynamic> toJson() => {
        'user_id': userId,
        'psychologist_id': psychologistId,
        'scheduled_at': scheduledAt.toIso8601String(),
        'status': status.name,
        'duration_minutes': durationMinutes,
        if (bookingFee > 0) 'booking_fee': bookingFee,
        if (agoraChannelName != null) 'agora_channel_name': agoraChannelName,
      };
}
