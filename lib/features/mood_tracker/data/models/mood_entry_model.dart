import '../../domain/entities/mood_entry_entity.dart';

class MoodEntryModel extends MoodEntry {
  const MoodEntryModel({
    required super.id,
    required super.userId,
    required super.moodType,
    required super.note,
    required super.createdAt,
    super.energyLevel,
    super.triggers = const [],
  });

  factory MoodEntryModel.fromJson(Map<String, dynamic> json) => MoodEntryModel(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        moodType: json['mood_type'] as String,
        note: json['note'] as String? ?? '',
        createdAt: DateTime.parse(json['created_at'] as String),
        energyLevel: json['energy_level'] as int?,
        triggers: List<String>.from(json['triggers'] as List? ?? []),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'mood_type': moodType,
        'note': note,
        'created_at': createdAt.toIso8601String(),
        'energy_level': energyLevel,
        'triggers': triggers,
      };
}
