import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/providers/supabase_provider.dart';
import '../../../../shared/widgets/mood_glyph.dart';
import '../../../assessment/presentation/providers/assessment_provider.dart';
import '../../../mood_tracker/domain/entities/mood_entry_entity.dart';
import '../../../mood_tracker/presentation/providers/mood_provider.dart';

part 'home_provider.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Models kept for generated code compatibility
// ─────────────────────────────────────────────────────────────────────────────

class UserProfile {
  const UserProfile({
    required this.id,
    required this.name,
    this.avatarUrl,
    this.streakDays = 0,
  });

  final String id;
  final String name;
  final String? avatarUrl;
  final int streakDays;
}

class PracticeItem {
  const PracticeItem({
    required this.title,
    required this.subtitle,
    required this.duration,
    required this.category,
    this.route,
  });

  final String title;
  final String subtitle;
  final String duration;
  final String category;
  final String? route;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generated providers (signatures must not change)
// ─────────────────────────────────────────────────────────────────────────────

@riverpod
Future<UserProfile> userProfile(Ref ref) async {
  final client = ref.watch(supabaseProvider);
  final user = client.auth.currentUser;
  if (user == null) throw Exception('Not authenticated');
  final meta = user.userMetadata ?? {};
  return UserProfile(
    id: user.id,
    name: meta['full_name'] as String? ?? 'Teman',
    avatarUrl: meta['avatar_url'] as String?,
  );
}

@riverpod
class TodayMood extends _$TodayMood {
  @override
  MoodType? build() => null;

  void select(MoodType mood) => state = mood;
}

@riverpod
List<PracticeItem> todayPractices(Ref ref) {
  return const [
    PracticeItem(
      title: 'Napas 4-7-8',
      subtitle: 'Latihan singkat',
      duration: '5 menit',
      category: 'Napas',
      route: '/home/cbt/breathing',
    ),
    PracticeItem(
      title: 'Tiga kalimat sebelum tidur',
      subtitle: 'Jurnal',
      duration: '4 menit',
      category: 'Refleksi',
      route: '/home/reflection',
    ),
    PracticeItem(
      title: 'Body scan untuk melepaskan hari',
      subtitle: 'Meditasi',
      duration: '12 menit',
      category: 'Relaksasi',
      route: '/home/cbt',
    ),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// New models
// ─────────────────────────────────────────────────────────────────────────────

class WeeklyMoodPoint {
  const WeeklyMoodPoint({
    required this.dayLabel,
    required this.date,
    this.score,
  });

  final String dayLabel; // 'Sen', 'Sel', …
  final DateTime date;
  final int? score; // 1–5, null if no entry that day
}

class UpcomingConsultation {
  const UpcomingConsultation({
    required this.psychologistName,
    required this.specialization,
    required this.scheduledAt,
    this.avatarUrl,
  });

  final String psychologistName;
  final String specialization;
  final DateTime scheduledAt;
  final String? avatarUrl;
}

class HomeDashboardData {
  const HomeDashboardData({
    required this.name,
    this.avatarUrl,
    required this.healthScore,
    required this.healthLabel,
    required this.healthInsight,
    required this.hasAssessment,
    required this.weeklyMood,
    required this.hasCheckedInToday,
    this.todayMoodType,
    this.lastAssessmentDaysAgo,
    this.upcomingConsultation,
    this.hasUnreadNotifications = false,
  });

  final String name;
  final String? avatarUrl;
  final int healthScore; // 0–100
  final String healthLabel;
  final String healthInsight;
  final bool hasAssessment;
  final List<WeeklyMoodPoint> weeklyMood;
  final bool hasCheckedInToday;
  final String? todayMoodType; // 'bahagia', 'tenang', …
  final int? lastAssessmentDaysAgo;
  final UpcomingConsultation? upcomingConsultation;
  final bool hasUnreadNotifications;
}

// ─────────────────────────────────────────────────────────────────────────────
// homeDataProvider — aggregates all home data (manual, no code-gen)
// ─────────────────────────────────────────────────────────────────────────────

final homeDataProvider =
    FutureProvider.autoDispose<HomeDashboardData>((ref) async {
  // Parallel fetch — errors fallback gracefully
  final profile = await ref.watch(userProfileProvider.future);

  final phq9History = await ref.watch(assessmentHistoryProvider('phq9').future);

  final gad7History = await ref.watch(assessmentHistoryProvider('gad7').future);

  final moodEntries = await ref.watch(moodEntriesProvider.future);

  // ── Health score ─────────────────────────────────────────────────────────
  final latestPhq9 = phq9History.isNotEmpty ? phq9History.first : null;
  final latestGad7 = gad7History.isNotEmpty ? gad7History.first : null;
  final healthScore = _computeHealthScore(
    phq9: latestPhq9?.totalScore,
    gad7: latestGad7?.totalScore,
    moods: moodEntries,
  );
  final healthLabel = _healthLabel(healthScore);
  final healthInsight = _healthInsight(healthScore);

  // ── Weekly mood ──────────────────────────────────────────────────────────
  final weeklyMood = _computeWeeklyMood(moodEntries);

  // ── Today mood ───────────────────────────────────────────────────────────
  final today = DateTime.now();
  final todayEntry = moodEntries.cast<MoodEntry?>().firstWhere(
        (e) =>
            e != null &&
            e.createdAt.year == today.year &&
            e.createdAt.month == today.month &&
            e.createdAt.day == today.day,
        orElse: () => null,
      );

  // ── Last assessment ──────────────────────────────────────────────────────
  int? lastAssessmentDaysAgo;
  final hasAssessment = latestPhq9 != null || latestGad7 != null;
  if (hasAssessment) {
    final dates = [
      if (latestPhq9 != null) latestPhq9.completedAt,
      if (latestGad7 != null) latestGad7.completedAt,
    ]..sort((a, b) => b.compareTo(a));
    lastAssessmentDaysAgo = today.difference(dates.first).inDays;
  }

  return HomeDashboardData(
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    healthScore: healthScore,
    healthLabel: healthLabel,
    healthInsight: healthInsight,
    hasAssessment: hasAssessment,
    weeklyMood: weeklyMood,
    hasCheckedInToday: todayEntry != null,
    todayMoodType: todayEntry?.moodType,
    lastAssessmentDaysAgo: lastAssessmentDaysAgo,
    // Consultations: mocked — wire to real data when telemedicine module ships
    upcomingConsultation: null,
    hasUnreadNotifications: false,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Pure logic helpers
// ─────────────────────────────────────────────────────────────────────────────

int _computeHealthScore({
  int? phq9,
  int? gad7,
  List<MoodEntry> moods = const [],
}) {
  double total = 0;
  double weight = 0;

  if (phq9 != null) {
    total += (1 - phq9 / 27) * 100 * 0.4;
    weight += 0.4;
  }
  if (gad7 != null) {
    total += (1 - gad7 / 21) * 100 * 0.4;
    weight += 0.4;
  }
  if (moods.isNotEmpty) {
    final avg = moods
            .take(3)
            .map((m) => _moodToHealthScore(m.moodType))
            .reduce((a, b) => a + b) /
        moods.take(3).length;
    total += avg * 0.2;
    weight += 0.2;
  }

  if (weight == 0) return 72; // no data → neutral-good default
  return (total / weight).round().clamp(0, 100);
}

double _moodToHealthScore(String moodType) => switch (moodType) {
      'bahagia' => 95,
      'syukur' => 88,
      'tenang' => 80,
      'hangat' => 72,
      'lelah' => 42,
      'cemas' => 30,
      'sedih' => 20,
      _ => 60,
    };

String _healthLabel(int score) {
  if (score >= 80) return 'Kondisi Baik';
  if (score >= 65) return 'Cukup Baik';
  if (score >= 50) return 'Perlu Perhatian';
  return 'Butuh Dukungan';
}

String _healthInsight(int score) {
  if (score >= 80) return 'Kamu melewati minggu ini dengan baik. Pertahankan.';
  if (score >= 65) return 'Kondisimu cukup stabil. Terus rawat diri ya.';
  if (score >= 50)
    return 'Ada beberapa hal yang perlu diperhatikan minggu ini.';
  return 'Kamu butuh lebih banyak dukungan. Jangan hadapi sendiri.';
}

List<WeeklyMoodPoint> _computeWeeklyMood(List<MoodEntry> entries) {
  final now = DateTime.now();
  return List.generate(7, (i) {
    final day =
        DateTime(now.year, now.month, now.day).subtract(Duration(days: 6 - i));
    final entry = entries.cast<MoodEntry?>().firstWhere(
          (e) =>
              e != null &&
              e.createdAt.year == day.year &&
              e.createdAt.month == day.month &&
              e.createdAt.day == day.day,
          orElse: () => null,
        );
    return WeeklyMoodPoint(
      dayLabel: DateFormat('EEE', 'id_ID').format(day),
      date: day,
      score: entry != null ? _moodToBarScore(entry.moodType) : null,
    );
  });
}

int _moodToBarScore(String moodType) => switch (moodType) {
      'bahagia' || 'syukur' => 5,
      'tenang' || 'hangat' => 4,
      'lelah' => 3,
      'cemas' => 2,
      'sedih' => 1,
      _ => 3,
    };
