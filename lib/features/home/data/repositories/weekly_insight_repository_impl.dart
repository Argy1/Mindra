import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/app_exception.dart';
import '../../domain/entities/weekly_insight_entity.dart';
import '../../domain/weekly_insight_engine.dart';

/// Fetches the raw weekly data from Supabase and delegates every computation
/// (trends, narrative, patterns, recommendation, badges) to the pure
/// [WeeklyInsightEngine] so the rule logic stays testable in isolation.
class WeeklyInsightRepositoryImpl {
  const WeeklyInsightRepositoryImpl(this._client);

  final SupabaseClient _client;

  Future<WeeklyInsightData> getWeeklyInsight({
    required String userId,
    required DateTime weekStart,
  }) async {
    final weekEnd = DateTime(
        weekStart.year, weekStart.month, weekStart.day + 6, 23, 59, 59);

    final moods = await _fetchMoods(userId, weekStart, weekEnd);
    final sleeps = await _fetchSleeps(userId, weekStart, weekEnd);
    final assessmentCount =
        await _fetchAssessmentCount(userId, weekStart, weekEnd);
    final reflectionCount =
        await _fetchReflectionCount(userId, weekStart, weekEnd);
    final streak = await _fetchStreakDays(userId);

    final cbtCount = await _fetchCbtCount(userId, weekStart, weekEnd);

    // ── Mood stats ──────────────────────────────────────────────────────────
    final moodPoints = _buildDayPoints(weekStart, moods);
    final scored = moodPoints.where((p) => p.score != null).toList();
    final double? avgMood = scored.isEmpty
        ? null
        : scored.map((p) => p.score!.toDouble()).reduce((a, b) => a + b) /
            scored.length;
    final moodTrend = WeeklyInsightEngine.computeMoodTrend(moodPoints);

    // ── Sleep stats ─────────────────────────────────────────────────────────
    double? avgSleep;
    int goodSleepNights = 0;
    final qualities = <int>[];
    if (sleeps.isNotEmpty) {
      final durations = sleeps.map((s) {
        final bed = DateTime.parse(s['bedtime'] as String);
        final wake = DateTime.parse(s['wake_time'] as String);
        return wake.difference(bed).inMinutes / 60.0;
      }).toList();
      avgSleep = durations.reduce((a, b) => a + b) / durations.length;
      for (final s in sleeps) {
        qualities.add(s['quality'] as int? ?? 3);
      }
      goodSleepNights = qualities.where((q) => q >= 4).length;
    }
    final sleepTrend = WeeklyInsightEngine.computeSleepTrend(qualities);

    // ── Derived text fields (pure engine) ───────────────────────────────────
    final narrative = WeeklyInsightEngine.buildNarrative(
      avgMood: avgMood,
      moodTrend: moodTrend,
      avgSleep: avgSleep,
      moodCount: scored.length,
      cbt: cbtCount,
      assessments: assessmentCount,
      reflections: reflectionCount,
    );
    final patterns = WeeklyInsightEngine.buildPatterns(
      avgMood: avgMood,
      moodTrend: moodTrend,
      avgSleep: avgSleep,
      goodSleepNights: goodSleepNights,
      cbt: cbtCount,
      streak: streak,
    );
    final recommendation = WeeklyInsightEngine.buildRecommendation(
      avgMood: avgMood,
      avgSleep: avgSleep,
      assessments: assessmentCount,
      cbt: cbtCount,
      reflections: reflectionCount,
    );
    final badges = WeeklyInsightEngine.buildBadges(
      streak: streak,
      goodSleep: goodSleepNights,
      cbt: cbtCount,
      assessments: assessmentCount,
      reflections: reflectionCount,
    );

    return WeeklyInsightData(
      weekStart: weekStart,
      weekEnd: weekEnd,
      moodPoints: moodPoints,
      avgMood: avgMood,
      moodTrend: moodTrend,
      avgSleepHours: avgSleep,
      sleepTrend: sleepTrend,
      goodSleepNights: goodSleepNights,
      assessmentsDone: assessmentCount,
      cbtSessionsDone: cbtCount,
      reflectionsDone: reflectionCount,
      streakDays: streak,
      narrative: narrative,
      patternInsights: patterns,
      recommendation: recommendation,
      badges: badges,
    );
  }

  // ── Supabase queries ────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> _fetchMoods(
      String userId, DateTime from, DateTime to) async {
    try {
      final data = await _client
          .from('mood_entries')
          .select('mood_type, created_at')
          .eq('user_id', userId)
          .gte('created_at', from.toIso8601String())
          .lte('created_at', to.toIso8601String())
          .order('created_at') as List;
      return data.cast<Map<String, dynamic>>();
    } catch (e, st) {
      throwAppException('Gagal memuat data mood mingguan.', e, st);
    }
  }

  Future<List<Map<String, dynamic>>> _fetchSleeps(
      String userId, DateTime from, DateTime to) async {
    try {
      final data = await _client
          .from('sleep_entries')
          .select('bedtime, wake_time, quality')
          .eq('user_id', userId)
          .gte('bedtime', from.toIso8601String())
          .lte('bedtime', to.toIso8601String())
          .order('bedtime') as List;
      return data.cast<Map<String, dynamic>>();
    } catch (e, st) {
      throwAppException('Gagal memuat data tidur mingguan.', e, st);
    }
  }

  Future<int> _fetchAssessmentCount(
      String userId, DateTime from, DateTime to) async {
    try {
      final data = await _client
          .from('assessments')
          .select('id')
          .eq('user_id', userId)
          .gte('completed_at', from.toIso8601String())
          .lte('completed_at', to.toIso8601String()) as List;
      return data.length;
    } catch (e, st) {
      throwAppException('Gagal memuat jumlah asesmen mingguan.', e, st);
    }
  }

  Future<int> _fetchReflectionCount(
      String userId, DateTime from, DateTime to) async {
    final dateFormat = DateFormat('yyyy-MM-dd');
    try {
      final data = await _client
          .from('night_reflections')
          .select('id')
          .eq('user_id', userId)
          .gte('date', dateFormat.format(from))
          .lte('date', dateFormat.format(to)) as List;
      return data.length;
    } catch (e, st) {
      throwAppException('Gagal memuat jumlah refleksi mingguan.', e, st);
    }
  }

  Future<int> _fetchCbtCount(String userId, DateTime from, DateTime to) async {
    // CBT completions are recorded in `exercise_sessions` (one row per finished
    // exercise, written by ExerciseRepositoryImpl.markExerciseComplete).
    final data = await _client
        .from('exercise_sessions')
        .select('id')
        .eq('user_id', userId)
        .gte('completed_at', from.toIso8601String())
        .lte('completed_at', to.toIso8601String()) as List;
    return data.length;
  }

  Future<int> _fetchStreakDays(String userId) async {
    try {
      final data = await _client
          .from('mood_entries')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(30) as List;

      final days = <String>{};
      for (final row in data) {
        final dt = DateTime.parse(row['created_at'] as String);
        days.add(DateFormat('yyyy-MM-dd').format(dt));
      }

      int streak = 0;
      var check = DateTime.now();
      while (true) {
        final key = DateFormat('yyyy-MM-dd').format(check);
        if (days.contains(key)) {
          streak++;
          check = check.subtract(const Duration(days: 1));
        } else {
          break;
        }
      }
      return streak;
    } catch (e, st) {
      throwAppException('Gagal memuat streak aktivitas.', e, st);
    }
  }

  // ── Day points ──────────────────────────────────────────────────────────────

  List<DayMoodPoint> _buildDayPoints(
      DateTime weekStart, List<Map<String, dynamic>> moods) {
    return List.generate(7, (i) {
      final day = DateTime(weekStart.year, weekStart.month, weekStart.day + i);
      final label = DateFormat('EEE', 'id_ID').format(day);

      final entry = moods.cast<Map<String, dynamic>?>().firstWhere(
        (m) {
          if (m == null) return false;
          final dt = DateTime.parse(m['created_at'] as String);
          return dt.year == day.year &&
              dt.month == day.month &&
              dt.day == day.day;
        },
        orElse: () => null,
      );

      if (entry == null) {
        return DayMoodPoint(date: day, dayLabel: label);
      }
      final moodType = entry['mood_type'] as String? ?? '';
      return DayMoodPoint(
        date: day,
        dayLabel: label,
        score: WeeklyInsightEngine.moodTypeToScore(moodType),
        moodType: moodType,
      );
    });
  }
}
