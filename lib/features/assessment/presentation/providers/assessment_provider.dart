import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../../features/auth/presentation/providers/auth_providers.dart';
import '../../data/assessment_model.dart';
import '../../data/assessment_repository.dart';

part 'assessment_provider.g.dart';

@riverpod
Future<List<Assessment>> assessmentList(Ref ref) =>
    ref.watch(assessmentRepositoryProvider).getAssessments();

@riverpod
Future<Assessment?> assessmentDetail(Ref ref, String id) =>
    ref.watch(assessmentRepositoryProvider).getAssessment(id);

@riverpod
Future<List<Question>> assessmentQuestions(Ref ref, String assessmentId) =>
    ref.watch(assessmentRepositoryProvider).getQuestions(assessmentId);

// ─────────────────────────────────────────────────────────────────────────────
// Session state
// ─────────────────────────────────────────────────────────────────────────────

class AssessmentSessionState {
  const AssessmentSessionState({
    required this.assessmentId,
    this.currentIndex = 0,
    this.answers = const {},
    this.isComplete = false,
    this.score,
    this.crisisDetected = false,
  });

  final String assessmentId;
  final int currentIndex;
  final Map<String, int> answers; // raw option values, NOT adjusted for reverse
  final bool isComplete;
  final int? score; // total clinical score (reverse-scored items adjusted)
  final bool crisisDetected; // PHQ-9 Q9 > 0 or SRQ-20 Q17 = 1

  int get answeredCount => answers.length;

  AssessmentSessionState copyWith({
    int? currentIndex,
    Map<String, int>? answers,
    bool? isComplete,
    int? score,
    bool? crisisDetected,
  }) =>
      AssessmentSessionState(
        assessmentId: assessmentId,
        currentIndex: currentIndex ?? this.currentIndex,
        answers: answers ?? this.answers,
        isComplete: isComplete ?? this.isComplete,
        score: score ?? this.score,
        crisisDetected: crisisDetected ?? this.crisisDetected,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Session notifier
// ─────────────────────────────────────────────────────────────────────────────

@riverpod
class AssessmentSession extends _$AssessmentSession {
  @override
  AssessmentSessionState build(String assessmentId) =>
      AssessmentSessionState(assessmentId: assessmentId);

  /// Records an answer. Pass the full [questions] list so the notifier can
  /// (a) detect when the user has finished, (b) compute the clinically-correct
  /// total score with reverse-scored items adjusted, and (c) flag crisis
  /// indicators (PHQ-9 item 9 > 0, SRQ-20 item 17 = 1).
  void answer(String questionId, int value, List<Question> questions) {
    final newAnswers = {...state.answers, questionId: value};
    final isLast = state.currentIndex >= questions.length - 1;

    if (isLast) {
      final total = _computeClinicalScore(questions, newAnswers);
      final crisis = _detectCrisis(state.assessmentId, newAnswers);
      state = state.copyWith(
        answers: newAnswers,
        isComplete: true,
        score: total,
        crisisDetected: crisis,
      );
    } else {
      state = state.copyWith(
        answers: newAnswers,
        currentIndex: state.currentIndex + 1,
      );
    }
  }

  void previous() {
    if (state.currentIndex > 0) {
      state = state.copyWith(currentIndex: state.currentIndex - 1);
    }
  }

  void reset() {
    state = AssessmentSessionState(assessmentId: state.assessmentId);
  }

  // ── Scoring helpers ────────────────────────────────────────────────────────

  static int _computeClinicalScore(
    List<Question> questions,
    Map<String, int> answers,
  ) {
    return questions.fold(0, (sum, q) {
      final raw = answers[q.id] ?? 0;
      final adjusted =
          q.isReverseScored ? (q.maxOptionValue - raw) : raw;
      return sum + adjusted;
    });
  }

  static bool _detectCrisis(String assessmentId, Map<String, int> answers) {
    if (assessmentId == 'phq9') {
      // PHQ-9 item 9: suicidal ideation
      return (answers['phq9_9'] ?? 0) > 0;
    }
    if (assessmentId == 'srq20') {
      // SRQ-20 item 17: thoughts of ending life
      return (answers['srq20_17'] ?? 0) > 0;
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Clinical thresholds — instrument-specific (not percentage-based)
// References:
//   PHQ-9  Kroenke, Spitzer & Williams (2001)
//   GAD-7  Spitzer, Kroenke & Williams (2006)
//   PSS-10 Cohen et al. (1983)
//   SRQ-20 Beusenberg & Orley / WHO (1994); cutoff ≥6 for ID/SE Asia
// ─────────────────────────────────────────────────────────────────────────────

class AssessmentClinical {
  AssessmentClinical._();

  /// Maximum possible total score for [instrumentId].
  static int maxScoreFor(String instrumentId) => switch (instrumentId) {
        'phq9'  => 27, // 9 items × 3
        'gad7'  => 21, // 7 items × 3
        'pss10' => 40, // 10 items × 4
        'srq20' => 20, // 20 items × 1
        _       => 100,
      };

  /// Returns a clinically-accurate Indonesian severity label for [score].
  static String labelIndonesian(String instrumentId, int score) {
    return switch (instrumentId) {
      'phq9' when score <= 4   => 'Minimal',
      'phq9' when score <= 9   => 'Ringan',
      'phq9' when score <= 14  => 'Sedang',
      'phq9' when score <= 19  => 'Sedang–Berat',
      'phq9'                   => 'Berat',
      'gad7' when score <= 4   => 'Minimal',
      'gad7' when score <= 9   => 'Ringan',
      'gad7' when score <= 14  => 'Sedang',
      'gad7'                   => 'Berat',
      'pss10' when score <= 13 => 'Stres Rendah',
      'pss10' when score <= 26 => 'Stres Sedang',
      'pss10'                  => 'Stres Tinggi',
      'srq20' when score <= 5  => 'Tidak ada gangguan',
      'srq20' when score <= 10 => 'Kemungkinan gangguan ringan',
      'srq20' when score <= 15 => 'Kemungkinan gangguan sedang',
      'srq20'                  => 'Kemungkinan gangguan berat',
      _                        => 'Tidak diketahui',
    };
  }

  /// English category for DB storage (matches assessments.category CHECK).
  /// Returns one of: minimal / mild / moderate / severe.
  static String categoryEnglish(String instrumentId, int score) {
    return switch (instrumentId) {
      'phq9' when score <= 4   => 'minimal',
      'phq9' when score <= 9   => 'mild',
      'phq9' when score <= 14  => 'moderate',
      'phq9'                   => 'severe',
      'gad7' when score <= 4   => 'minimal',
      'gad7' when score <= 9   => 'mild',
      'gad7' when score <= 14  => 'moderate',
      'gad7'                   => 'severe',
      'pss10' when score <= 13 => 'minimal',
      'pss10' when score <= 26 => 'moderate',
      'pss10'                  => 'severe',
      'srq20' when score <= 5  => 'minimal',
      'srq20' when score <= 10 => 'mild',
      'srq20' when score <= 15 => 'moderate',
      'srq20'                  => 'severe',
      _                        => 'minimal',
    };
  }

  /// Severity tier 0–3 — useful for UI color mapping.
  /// 0 = minimal, 1 = ringan, 2 = sedang, 3 = berat
  static int tier(String instrumentId, int score) {
    return switch (categoryEnglish(instrumentId, score)) {
      'minimal'  => 0,
      'mild'     => 1,
      'moderate' => 2,
      _          => 3,
    };
  }

  /// Plain-language Indonesian explanation of the result.
  /// Warm, non-clinical tone. Suitable for the result screen.
  static String explanation(String instrumentId, int score) {
    final t = tier(instrumentId, score);
    return switch ((instrumentId, t)) {
      ('phq9', 0) =>
        'Hasilmu menunjukkan gejala depresi yang minimal. Kondisi emosionalmu cenderung stabil dalam dua minggu terakhir.',
      ('phq9', 1) =>
        'Ada beberapa gejala ringan yang muncul. Ini hal yang umum dialami — penting untuk merawat diri dan memperhatikan tanda-tandanya.',
      ('phq9', 2) =>
        'Gejala depresi tingkat sedang terdeteksi. Berbicara dengan psikolog atau tenaga kesehatan jiwa bisa sangat membantu.',
      ('phq9', 3) =>
        'Hasilmu menunjukkan gejala yang signifikan. Kami sangat menyarankan untuk segera berbicara dengan profesional kesehatan jiwa.',
      ('gad7', 0) =>
        'Tingkat kecemasanmu rendah. Kamu cenderung mampu mengelola perasaan cemas dalam dua minggu terakhir.',
      ('gad7', 1) =>
        'Ada gejala kecemasan ringan. Latihan pernapasan dan jurnal harian bisa membantu menjaga keseimbangan.',
      ('gad7', 2) =>
        'Kecemasan terasa cukup mengganggu. Pertimbangkan untuk berbicara dengan psikolog untuk strategi pengelolaan yang tepat.',
      ('gad7', 3) =>
        'Kecemasan yang kamu rasakan signifikan. Bantuan profesional sangat dianjurkan untuk membantu menanganinya.',
      ('pss10', 0) =>
        'Tingkat stresmu rendah. Kamu cenderung mampu mengelola tekanan dengan baik dalam sebulan terakhir.',
      ('pss10', 1) =>
        'Tingkat stresmu sedang. Beberapa strategi seperti latihan pernapasan, journaling, atau membatasi paparan stresor dapat membantu.',
      ('pss10', 2) =>
        'Tingkat stresmu sedang. Pertimbangkan untuk berbicara dengan psikolog atau mencoba latihan CBT untuk mengelolanya.',
      ('pss10', 3) =>
        'Tingkat stresmu tinggi. Sangat dianjurkan untuk mencari dukungan profesional dan memberi ruang istirahat bagi diri sendiri.',
      ('srq20', 0) =>
        'Skrining tidak menunjukkan tanda gangguan jiwa umum. Tetap perhatikan kesejahteraanmu secara berkala.',
      ('srq20', 1) =>
        'Ada beberapa indikasi yang perlu diperhatikan. Self-care dan pemantauan mood harian dapat membantu.',
      ('srq20', 2) =>
        'Indikasi gangguan sedang terdeteksi. Konsultasi dengan tenaga kesehatan jiwa di Puskesmas atau psikolog dianjurkan.',
      ('srq20', 3) =>
        'Indikasi yang signifikan terdeteksi. Segera cari bantuan profesional — kamu tidak harus menghadapinya sendiri.',
      _ =>
        'Hasil asesmen telah tersimpan. Konsultasikan dengan tenaga kesehatan jiwa jika ada hal yang ingin kamu diskusikan.',
    };
  }

  /// Returns 3 personalized recommendations based on severity tier.
  static List<AssessmentRecommendation> recommendationsFor(
    String instrumentId,
    int score,
  ) {
    final t = tier(instrumentId, score);
    return switch (t) {
      0 => const [
          AssessmentRecommendation(
            title: 'Catat mood harian',
            description: 'Pantau perasaanmu setiap hari untuk mengenali pola.',
            ctaLabel: 'Buka Mood Tracker',
            route: '/home/mood',
          ),
          AssessmentRecommendation(
            title: 'Refleksi malam',
            description: 'Tiga kalimat singkat sebelum tidur — ringan tapi bermakna.',
            ctaLabel: 'Mulai Refleksi',
            route: '/home/reflection',
          ),
          AssessmentRecommendation(
            title: 'Lakukan ulang dalam 2 minggu',
            description: 'Pemeriksaan rutin membantu memantau perkembangan.',
            ctaLabel: 'Atur Pengingat',
            route: '/home/profile',
          ),
        ],
      1 => const [
          AssessmentRecommendation(
            title: 'Latihan pernapasan 4-7-8',
            description: 'Lima menit yang bisa menenangkan pikiran dan tubuh.',
            ctaLabel: 'Mulai Latihan',
            route: '/home/cbt/breathing',
          ),
          AssessmentRecommendation(
            title: 'Bicara dengan Mindra',
            description: 'AI companion yang siap mendengar kapan saja.',
            ctaLabel: 'Buka Chat',
            route: '/home/ai-chat',
          ),
          AssessmentRecommendation(
            title: 'Thought Record',
            description: 'Latihan CBT untuk menata ulang pikiran yang mengganggu.',
            ctaLabel: 'Coba Sekarang',
            route: '/home/cbt/thought_record',
          ),
        ],
      2 => const [
          AssessmentRecommendation(
            title: 'Konsultasi dengan psikolog',
            description:
                'Berbicara dengan profesional dapat memberi strategi yang tepat untuk kondisimu.',
            ctaLabel: 'Lihat Psikolog',
            route: '/home/telemedicine',
            highlight: true,
          ),
          AssessmentRecommendation(
            title: 'Latihan CBT terpandu',
            description: 'Thought record, behavioral activation, dan relaksasi.',
            ctaLabel: 'Mulai Latihan',
            route: '/home/cbt',
          ),
          AssessmentRecommendation(
            title: 'Buat jaringan dukungan',
            description: 'Tambahkan kontak darurat dan keluarga sebagai caregiver.',
            ctaLabel: 'Atur Caregiver',
            route: '/home/caregiver',
          ),
        ],
      _ => const [
          AssessmentRecommendation(
            title: 'Konsultasi segera dengan psikolog',
            description:
                'Hasilmu menunjukkan kondisi yang perlu perhatian profesional. Jangan tunda mencari bantuan.',
            ctaLabel: 'Cari Psikolog',
            route: '/home/telemedicine',
            highlight: true,
          ),
          AssessmentRecommendation(
            title: 'Hubungi Hotline Krisis',
            description:
                'Layanan kesehatan jiwa 119 ext. 8 (SEJIWA, Kemenkes) tersedia 24 jam.',
            ctaLabel: 'Lihat Bantuan',
            route: '/home/crisis',
            highlight: true,
          ),
          AssessmentRecommendation(
            title: 'Teknik grounding 5-4-3-2-1',
            description:
                'Latihan singkat untuk membantu menenangkan saat perasaan terasa berat.',
            ctaLabel: 'Mulai Grounding',
            route: '/home/crisis/grounding',
          ),
        ],
    };
  }
}

class AssessmentRecommendation {
  const AssessmentRecommendation({
    required this.title,
    required this.description,
    required this.ctaLabel,
    required this.route,
    this.highlight = false,
  });

  final String title;
  final String description;
  final String ctaLabel;
  final String route;
  final bool highlight;
}

// ─────────────────────────────────────────────────────────────────────────────
// History & trend providers (manual, no code-gen needed)
// ─────────────────────────────────────────────────────────────────────────────

class TrendPoint {
  const TrendPoint({
    required this.date,
    required this.score,
    required this.category,
  });

  final DateTime date;
  final int score;
  final String category;
}

/// Last 10 results for [instrumentType], most-recent-first.
final assessmentHistoryProvider =
    FutureProvider.family<List<AssessmentResult>, String>(
  (ref, instrumentType) async {
    final userId = ref.watch(currentUserProvider)?.id;
    if (userId == null) return const [];
    return ref.read(assessmentRepositoryProvider).getAssessmentHistory(
          userId: userId,
          instrumentType: instrumentType,
          limit: 10,
        );
  },
);

/// Chronological trend points (oldest→newest) derived from history.
final assessmentTrendProvider =
    FutureProvider.family<List<TrendPoint>, String>(
  (ref, instrumentType) async {
    final history =
        await ref.watch(assessmentHistoryProvider(instrumentType).future);
    return history.reversed
        .map((r) => TrendPoint(
              date: r.completedAt,
              score: r.totalScore,
              category: r.category,
            ))
        .toList();
  },
);
