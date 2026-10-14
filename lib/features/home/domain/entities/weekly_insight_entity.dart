enum MoodTrend { rising, falling, stable, insufficient }

enum SleepTrend { rising, falling, stable, insufficient }

class DayMoodPoint {
  const DayMoodPoint({
    required this.date,
    required this.dayLabel,
    this.score,
    this.moodType,
  });

  final DateTime date;
  final String dayLabel;
  final int? score; // 1–5, null = no entry
  final String? moodType;
}

enum WeeklyBadge {
  streak3,
  goodSleep,
  exercise3,
  assessmentDone,
  reflectionComplete,
  consultation;

  String get emoji => switch (this) {
        WeeklyBadge.streak3 => '🔥',
        WeeklyBadge.goodSleep => '😴',
        WeeklyBadge.exercise3 => '🧘',
        WeeklyBadge.assessmentDone => '📋',
        WeeklyBadge.reflectionComplete => '✨',
        WeeklyBadge.consultation => '💬',
      };

  String get label => switch (this) {
        WeeklyBadge.streak3 => 'Konsisten 3+ hari',
        WeeklyBadge.goodSleep => 'Tidur berkualitas',
        WeeklyBadge.exercise3 => 'Aktif latihan',
        WeeklyBadge.assessmentDone => 'Asesmen selesai',
        WeeklyBadge.reflectionComplete => 'Refleksi rutin',
        WeeklyBadge.consultation => 'Konsultasi',
      };
}

class WeeklyInsightData {
  const WeeklyInsightData({
    required this.weekStart,
    required this.weekEnd,
    required this.moodPoints,
    this.avgMood,
    this.moodTrend = MoodTrend.insufficient,
    this.avgSleepHours,
    this.sleepTrend = SleepTrend.insufficient,
    this.goodSleepNights = 0,
    this.assessmentsDone = 0,
    this.cbtSessionsDone = 0,
    this.reflectionsDone = 0,
    this.streakDays = 0,
    this.hasConsultation = false,
    this.narrative = '',
    this.patternInsights = const [],
    this.recommendation,
    this.badges = const [],
  });

  final DateTime weekStart;
  final DateTime weekEnd;
  final List<DayMoodPoint> moodPoints;
  final double? avgMood;
  final MoodTrend moodTrend;
  final double? avgSleepHours;
  final SleepTrend sleepTrend;
  final int goodSleepNights;
  final int assessmentsDone;
  final int cbtSessionsDone;
  final int reflectionsDone;
  final int streakDays;
  final bool hasConsultation;
  final String narrative;
  final List<String> patternInsights;
  final String? recommendation;
  final List<WeeklyBadge> badges;
}
