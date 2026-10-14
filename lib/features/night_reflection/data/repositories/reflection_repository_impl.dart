import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/errors/app_exception.dart';
import '../../domain/entities/reflection_entity.dart';
import '../datasources/question_bank.dart';

class ReflectionRepositoryImpl {
  const ReflectionRepositoryImpl(this._client);

  final SupabaseClient _client;

  Future<List<NightReflection>> getReflections({
    required String userId,
    int limit = 90,
  }) async {
    try {
      final data = await _client
          .from('night_reflections')
          .select()
          .eq('user_id', userId)
          .order('date', ascending: false)
          .limit(limit) as List;

      return data.map((e) => _fromRow(e as Map<String, dynamic>)).toList();
    } catch (e, st) {
      throwAppException('Gagal memuat riwayat refleksi.', e, st);
    }
  }

  Future<NightReflection?> getReflectionForDate(
      String userId, DateTime date) async {
    final dateStr = _dateStr(date);
    try {
      final data = await _client
          .from('night_reflections')
          .select()
          .eq('user_id', userId)
          .eq('date', dateStr)
          .maybeSingle();
      if (data == null) return null;
      return _fromRow(data);
    } catch (e, st) {
      throwAppException('Gagal memuat refleksi tanggal ini.', e, st);
    }
  }

  Future<void> saveReflection({
    required String userId,
    required DateTime date,
    required List<ReflectionAnswer> answers,
    int? moodAfter,
  }) async {
    final id = const Uuid().v4();
    final dateStr = _dateStr(date);
    await _client.from('night_reflections').upsert({
      'id': id,
      'user_id': userId,
      'date': dateStr,
      'answers': answers.map((a) => a.toJson()).toList(),
      'mood_after': moodAfter,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  NightReflection _fromRow(Map<String, dynamic> row) {
    try {
      final rawAnswers = row['answers'];
      List<ReflectionAnswer> answers;

      if (rawAnswers is List) {
        answers = rawAnswers
            .map((a) => ReflectionAnswer.fromJson(a as Map<String, dynamic>))
            .toList();
      } else {
        // Legacy row with gratitude/highlight/tomorrow fields
        final qs = questionsForDate(DateTime.parse(
            row['date'] as String? ?? row['created_at'] as String));
        answers = [
          if (row['gratitude'] != null)
            ReflectionAnswer(
              questionId: qs[0].id,
              questionText: qs[0].text,
              answer: row['gratitude'] as String,
              category: ReflectionCategory.gratitude,
            ),
          if (row['highlight'] != null)
            ReflectionAnswer(
              questionId: qs[1].id,
              questionText: qs[1].text,
              answer: row['highlight'] as String,
              category: ReflectionCategory.challenges,
            ),
          if (row['tomorrow'] != null)
            ReflectionAnswer(
              questionId: qs[4].id,
              questionText: qs[4].text,
              answer: row['tomorrow'] as String,
              category: ReflectionCategory.lettingGo,
            ),
        ];
      }

      final dateRaw = row['date'] as String? ?? row['created_at'] as String;
      return NightReflection(
        id: row['id'] as String,
        userId: row['user_id'] as String,
        date: DateTime.parse(dateRaw),
        answers: answers,
        moodAfter: (row['mood_after'] ?? row['mood_score']) as int?,
        createdAt: DateTime.parse(row['created_at'] as String),
      );
    } catch (e) {
      throw FormatException('Format data refleksi tidak valid.', e);
    }
  }

  String _dateStr(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}
