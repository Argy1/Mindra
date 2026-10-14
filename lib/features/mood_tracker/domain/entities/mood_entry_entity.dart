class MoodEntry {
  const MoodEntry({
    required this.id,
    required this.userId,
    required this.moodType,
    required this.note,
    required this.createdAt,
    this.energyLevel,
    this.triggers = const [],
  });

  final String id;
  final String userId;
  final String moodType;
  final String note;
  final DateTime createdAt;
  final int? energyLevel;
  final List<String> triggers;
}
