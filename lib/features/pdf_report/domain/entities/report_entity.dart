abstract final class ReportSection {
  static const assessments = 'assessments';
  static const mood = 'mood';
  static const sleep = 'sleep';
  static const consultations = 'consultations';
  static const reflections = 'reflections';

  static const all = {
    assessments,
    mood,
    sleep,
    consultations,
    reflections,
  };
}

// ── Lightweight DTOs for report data ──────────────────────────────────────────

class AssessmentResultSummary {
  const AssessmentResultSummary({
    required this.type,
    required this.score,
    required this.category,
    required this.date,
  });

  final String type;
  final int score;
  final String category;
  final DateTime date;

  String get typeLabel => switch (type.toLowerCase()) {
        'phq9' => 'PHQ-9 (Depresi)',
        'gad7' => 'GAD-7 (Kecemasan)',
        'pss' || 'pss10' => 'PSS-10 (Stres)',
        'srq20' => 'SRQ-20',
        _ => type.toUpperCase(),
      };

  String get maxScore => switch (type.toLowerCase()) {
        'phq9' => '27',
        'gad7' => '21',
        'pss' || 'pss10' => '40',
        'srq20' => '20',
        _ => '?',
      };
}

class MoodSummaryEntry {
  const MoodSummaryEntry({
    required this.moodType,
    required this.date,
    required this.score,
    this.triggers = const [],
  });

  final String moodType;
  final DateTime date;
  final int score; // 1–7 where 7 = best
  final List<String> triggers;
}

class SleepSummaryEntry {
  const SleepSummaryEntry({
    required this.date,
    required this.hours,
    required this.quality,
  });

  final DateTime date;
  final double hours;
  final int quality; // 1–5
}

class ConsultationSummaryEntry {
  const ConsultationSummaryEntry({
    required this.date,
    required this.psychologistName,
    required this.durationMinutes,
    required this.status,
  });

  final DateTime date;
  final String psychologistName;
  final int durationMinutes;
  final String status;
}

class ReflectionEntry {
  const ReflectionEntry({
    required this.id,
    required this.date,
    required this.gratitude,
    required this.highlight,
    required this.tomorrow,
    this.moodScore,
  });

  final String id;
  final DateTime date;
  final String gratitude;
  final String highlight;
  final String tomorrow;
  final int? moodScore;
}

// ── Main report aggregate ─────────────────────────────────────────────────────

class MindraReport {
  const MindraReport({
    required this.userId,
    required this.userName,
    required this.generatedAt,
    required this.periodDays,
    required this.sections,
    required this.selectedReflectionIds,
    this.assessmentResults = const [],
    this.moodEntries = const [],
    this.sleepEntries = const [],
    this.consultations = const [],
    this.reflections = const [],
  });

  final String userId;
  final String userName;
  final DateTime generatedAt;
  final int periodDays;
  final Set<String> sections;
  final List<String> selectedReflectionIds;

  final List<AssessmentResultSummary> assessmentResults;
  final List<MoodSummaryEntry> moodEntries;
  final List<SleepSummaryEntry> sleepEntries;
  final List<ConsultationSummaryEntry> consultations;
  final List<ReflectionEntry> reflections;

  List<ReflectionEntry> get selectedReflections => selectedReflectionIds.isEmpty
      ? reflections
      : reflections.where((r) => selectedReflectionIds.contains(r.id)).toList();

  double get avgMoodScore {
    if (moodEntries.isEmpty) return 0;
    return moodEntries.map((e) => e.score).reduce((a, b) => a + b) /
        moodEntries.length;
  }

  double get avgSleepHours {
    if (sleepEntries.isEmpty) return 0;
    return sleepEntries.map((e) => e.hours).reduce((a, b) => a + b) /
        sleepEntries.length;
  }

  double get avgSleepQuality {
    if (sleepEntries.isEmpty) return 0;
    return sleepEntries.map((e) => e.quality.toDouble()).reduce((a, b) => a + b) /
        sleepEntries.length;
  }

  Map<String, int> get topTriggers {
    final counts = <String, int>{};
    for (final e in moodEntries) {
      for (final t in e.triggers) {
        counts[t] = (counts[t] ?? 0) + 1;
      }
    }
    final sorted = counts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return Map.fromEntries(sorted.take(5));
  }
}
