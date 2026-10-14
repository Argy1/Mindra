class VoiceJournalEntry {
  const VoiceJournalEntry({
    required this.id,
    required this.userId,
    required this.storagePath,
    required this.durationSeconds,
    required this.recordedAt,
    required this.createdAt,
    this.moodEmoji,
    this.note,
  });

  final String id;
  final String userId;
  final String storagePath;
  final int durationSeconds;
  final String? moodEmoji;
  final String? note;
  final DateTime recordedAt;
  final DateTime createdAt;

  String get durationLabel {
    final m = durationSeconds ~/ 60;
    final s = durationSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }
}
