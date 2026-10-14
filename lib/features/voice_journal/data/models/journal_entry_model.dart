import '../../domain/entities/journal_entry_entity.dart';

class VoiceJournalEntryModel extends VoiceJournalEntry {
  const VoiceJournalEntryModel({
    required super.id,
    required super.userId,
    required super.storagePath,
    required super.durationSeconds,
    required super.recordedAt,
    required super.createdAt,
    super.moodEmoji,
    super.note,
  });

  factory VoiceJournalEntryModel.fromJson(Map<String, dynamic> j) =>
      VoiceJournalEntryModel(
        id: j['id'] as String,
        userId: j['user_id'] as String,
        storagePath: j['storage_path'] as String,
        durationSeconds: j['duration_seconds'] as int? ?? 0,
        moodEmoji: j['mood_emoji'] as String?,
        note: j['note'] as String?,
        recordedAt: DateTime.parse(j['recorded_at'] as String),
        createdAt: DateTime.parse(j['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'storage_path': storagePath,
        'duration_seconds': durationSeconds,
        'mood_emoji': moodEmoji,
        'note': note,
        'recorded_at': recordedAt.toIso8601String(),
        'created_at': createdAt.toIso8601String(),
      };
}
