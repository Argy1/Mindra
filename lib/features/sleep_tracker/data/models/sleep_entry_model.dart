import '../../domain/entities/sleep_entry_entity.dart';

class SleepEntryModel extends SleepEntry {
  const SleepEntryModel({
    required super.id,
    required super.userId,
    required super.bedtime,
    required super.wakeTime,
    required super.quality,
    super.notes,
  });

  factory SleepEntryModel.fromJson(Map<String, dynamic> json) => SleepEntryModel(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        bedtime: DateTime.parse(json['bedtime'] as String),
        wakeTime: DateTime.parse(json['wake_time'] as String),
        quality: json['quality'] as int,
        notes: json['notes'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'bedtime': bedtime.toIso8601String(),
        'wake_time': wakeTime.toIso8601String(),
        'quality': quality,
        'notes': notes,
      };
}
