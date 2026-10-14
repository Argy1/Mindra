import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/errors/app_exception.dart';
import '../../domain/entities/exercise_entity.dart';
import '../datasources/cbt_static_data.dart';

class ExerciseRepositoryImpl {
  const ExerciseRepositoryImpl(this._client);

  final SupabaseClient _client;

  // ─── Streaks ──────────────────────────────────────────────────────────────

  Future<Map<String, int>> getStreaks(String userId) async {
    try {
      final data = await _client
          .from('exercise_sessions')
          .select('exercise_type, completed_at')
          .eq('user_id', userId)
          .order('completed_at', ascending: false)
          .limit(200) as List;

      final byType = <String, List<DateTime>>{};
      for (final row in data) {
        final type = row['exercise_type'] as String;
        final date = DateTime.parse(row['completed_at'] as String);
        byType.putIfAbsent(type, () => []).add(date);
      }

      return byType.map((type, dates) => MapEntry(type, _calcStreak(dates)));
    } catch (e, st) {
      throwAppException('Gagal memuat streak latihan.', e, st);
    }
  }

  int _calcStreak(List<DateTime> dates) {
    if (dates.isEmpty) return 0;
    final days = dates
        .map((d) => DateTime(d.year, d.month, d.day))
        .toSet()
        .toList()
      ..sort((a, b) => b.compareTo(a));

    final today = DateTime.now();
    final todayNorm = DateTime(today.year, today.month, today.day);
    if (days.first.isBefore(todayNorm.subtract(const Duration(days: 1))))
      return 0;

    var streak = 1;
    for (var i = 1; i < days.length; i++) {
      if (days[i - 1].difference(days[i]).inDays == 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  Future<void> markExerciseComplete(String userId, String exerciseType) async {
    try {
      await _client.from('exercise_sessions').insert({
        'id': const Uuid().v4(),
        'user_id': userId,
        'exercise_type': exerciseType,
        'completed_at': DateTime.now().toIso8601String(),
      });
    } catch (e, st) {
      throwAppException('Gagal menyimpan progres latihan.', e, st);
    }
  }

  // ─── Thought Records ──────────────────────────────────────────────────────

  Future<String> saveThoughtRecord(
      ThoughtRecordDraft draft, String userId) async {
    final id = const Uuid().v4();
    await _client.from('thought_records').insert({
      'id': id,
      'user_id': userId,
      'created_at': DateTime.now().toIso8601String(),
      'situation': draft.situation,
      'emotions': draft.emotions.map((e) => e.toJson()).toList(),
      'automatic_thought': draft.automaticThought,
      'supporting_evidence': draft.supportingEvidence,
      'counter_evidence': draft.counterEvidence,
      'balanced_thought': draft.balancedThought,
      'belief_score': draft.beliefScore,
      'after_emotions': draft.afterEmotions.map((e) => e.toJson()).toList(),
    });
    return id;
  }

  // ─── Activity Logs ────────────────────────────────────────────────────────

  Future<List<ActivityItem>> getActivityLog(
      String userId, DateTime date) async {
    final dateStr = _dateStr(date);
    try {
      final data = await _client
          .from('activity_logs')
          .select('activities')
          .eq('user_id', userId)
          .eq('date', dateStr)
          .maybeSingle();

      if (data == null) return List.from(kDefaultActivities);
      final activities = data['activities'] as List;
      return activities
          .map((a) => ActivityItem.fromJson(a as Map<String, dynamic>))
          .toList();
    } catch (e, st) {
      throwAppException('Gagal memuat aktivitas harian.', e, st);
    }
  }

  Future<void> saveActivityLog(
      String userId, DateTime date, List<ActivityItem> activities) async {
    final dateStr = _dateStr(date);
    await _client.from('activity_logs').upsert({
      'user_id': userId,
      'date': dateStr,
      'activities': activities.map((a) => a.toJson()).toList(),
      'updated_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> getWeeklyActivityStats(
      String userId, DateTime weekStart) async {
    try {
      final results = <Map<String, dynamic>>[];
      for (var i = 0; i < 7; i++) {
        final d = weekStart.add(Duration(days: i));
        final log = await getActivityLog(userId, d);
        final completed = log.where((a) => a.isCompleted).length;
        results.add({
          'date': d,
          'completed': completed,
          'total': log.length,
        });
      }
      return results;
    } catch (e, st) {
      throwAppException('Gagal memuat statistik aktivitas.', e, st);
    }
  }

  String _dateStr(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}
