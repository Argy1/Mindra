import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/providers/supabase_provider.dart';
import 'assessment_model.dart';

part 'assessment_repository.g.dart';

@riverpod
AssessmentRepository assessmentRepository(Ref ref) {
  return AssessmentRepository(ref.watch(supabaseProvider));
}

class AssessmentRepository {
  const AssessmentRepository(this._client);

  final dynamic _client; // SupabaseClient

  // ── Catalog ────────────────────────────────────────────────────────────────

  Future<List<Assessment>> getAssessments() async {
    // The catalog is authoritative in code — seeds match the clinical
    // instrument standards (PHQ-9, GAD-7, PSS-10, SRQ-20).
    return Assessment.seeds;
  }

  Future<Assessment?> getAssessment(String id) async {
    return Assessment.seeds.firstWhere(
      (a) => a.id == id,
      orElse: () => Assessment.seeds.first,
    );
  }

  Future<List<Question>> getQuestions(String assessmentId) async {
    // Questions are clinical-standard and bundled with the app for offline use.
    return Question.seedsFor(assessmentId);
  }

  // ── Result persistence ─────────────────────────────────────────────────────

  /// Persists a completed assessment to the `assessments` table.
  /// Matches the schema in supabase/migrations/20240101000000_initial_schema.sql.
  Future<Map<String, dynamic>?> saveResult({
    required String userId,
    required String instrumentType, // 'phq9' | 'gad7' | 'pss10' | 'srq20'
    required Map<String, int> answers,
    required int totalScore,
    required String category, // 'minimal' | 'mild' | 'moderate' | 'severe'
  }) async {
    try {
      final answersArray = answers.entries
          .map((e) => {'question_id': e.key, 'score': e.value})
          .toList();

      final data = await _client
          .from('assessments')
          .insert({
            'user_id': userId,
            'type': instrumentType,
            'answers': answersArray,
            'total_score': totalScore,
            'category': category,
            'completed_at': DateTime.now().toIso8601String(),
            'sent_to_satusehat': false,
          })
          .select()
          .single();

      return data as Map<String, dynamic>;
    } catch (e, st) {
      throwAppException('Gagal menyimpan hasil asesmen.', e, st);
    }
  }

  /// Marks a saved assessment as sent to SATUSEHAT.
  Future<void> markSentToSatusehat(String resultId) async {
    try {
      await _client.from('assessments').update({
        'sent_to_satusehat': true,
      }).eq('id', resultId);
    } catch (e, st) {
      throwAppException('Gagal memperbarui status SATUSEHAT.', e, st);
    }
  }

  /// Fetches the user's last [limit] results for a given [instrumentType].
  /// Returns most-recent-first.
  Future<List<AssessmentResult>> getAssessmentHistory({
    required String userId,
    required String instrumentType,
    int limit = 5,
  }) async {
    try {
      final data = await _client
          .from('assessments')
          .select()
          .eq('user_id', userId)
          .eq('type', instrumentType)
          .order('completed_at', ascending: false)
          .limit(limit) as List;
      return data
          .map((e) => AssessmentResult.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e, st) {
      throwAppException('Gagal memuat riwayat asesmen.', e, st);
    }
  }
}

/// Read-only DTO for a persisted assessment result.
class AssessmentResult {
  const AssessmentResult({
    required this.id,
    required this.userId,
    required this.type,
    required this.totalScore,
    required this.category,
    required this.completedAt,
    this.answers = const [],
    this.sentToSatusehat = false,
  });

  final String id;
  final String userId;
  final String type;
  final int totalScore;
  final String category;
  final DateTime completedAt;

  /// Stored answers: [{question_id: String, score: int}, ...]
  final List<Map<String, dynamic>> answers;
  final bool sentToSatusehat;

  factory AssessmentResult.fromJson(Map<String, dynamic> j) {
    final rawAnswers = j['answers'];
    final answers = rawAnswers is List
        ? rawAnswers.map((e) => Map<String, dynamic>.from(e as Map)).toList()
        : <Map<String, dynamic>>[];
    return AssessmentResult(
      id: j['id'] as String,
      userId: j['user_id'] as String,
      type: j['type'] as String,
      totalScore: j['total_score'] as int? ?? 0,
      category: j['category'] as String? ?? 'minimal',
      completedAt: DateTime.tryParse(j['completed_at'] as String? ?? '') ??
          DateTime.now(),
      answers: answers,
      sentToSatusehat: j['sent_to_satusehat'] as bool? ?? false,
    );
  }
}
