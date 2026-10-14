// ─────────────────────────────────────────────────────────────────────────────
// Night Reflection — Domain Entities
// ─────────────────────────────────────────────────────────────────────────────

enum ReflectionCategory { gratitude, challenges, selfCompassion, insight, lettingGo }

extension ReflectionCategoryX on ReflectionCategory {
  String get label => switch (this) {
        ReflectionCategory.gratitude => 'Rasa Syukur',
        ReflectionCategory.challenges => 'Tantangan',
        ReflectionCategory.selfCompassion => 'Kasih Sayang Diri',
        ReflectionCategory.insight => 'Wawasan',
        ReflectionCategory.lettingGo => 'Melepaskan',
      };
  String get emoji => switch (this) {
        ReflectionCategory.gratitude => '🙏',
        ReflectionCategory.challenges => '💪',
        ReflectionCategory.selfCompassion => '💛',
        ReflectionCategory.insight => '🔍',
        ReflectionCategory.lettingGo => '🕊️',
      };
}

// ─── Question ─────────────────────────────────────────────────────────────────

class ReflectionQuestion {
  const ReflectionQuestion({
    required this.id,
    required this.text,
    required this.category,
  });

  final int id;
  final String text;
  final ReflectionCategory category;
}

// ─── Answer ───────────────────────────────────────────────────────────────────

class ReflectionAnswer {
  const ReflectionAnswer({
    required this.questionId,
    required this.questionText,
    required this.answer,
    required this.category,
  });

  final int questionId;
  final String questionText;
  final String answer;
  final ReflectionCategory category;

  Map<String, dynamic> toJson() => {
        'question_id': questionId,
        'question_text': questionText,
        'answer': answer,
        'category': category.name,
      };

  factory ReflectionAnswer.fromJson(Map<String, dynamic> j) => ReflectionAnswer(
        questionId: (j['question_id'] as num).toInt(),
        questionText: j['question_text'] as String,
        answer: j['answer'] as String,
        category: ReflectionCategory.values.firstWhere(
          (c) => c.name == j['category'],
          orElse: () => ReflectionCategory.gratitude,
        ),
      );
}

// ─── Saved Reflection ─────────────────────────────────────────────────────────

class NightReflection {
  const NightReflection({
    required this.id,
    required this.userId,
    required this.date,
    required this.answers,
    this.moodAfter,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final DateTime date;
  final List<ReflectionAnswer> answers;
  final int? moodAfter; // 1–5
  final DateTime createdAt;
}

// ─── Session Draft (in-progress reflection) ───────────────────────────────────

class ReflectionSessionDraft {
  const ReflectionSessionDraft({
    required this.questions,
    this.currentIndex = 0,
    this.answers = const {},
    this.isComplete = false,
    this.moodAfter,
    this.isSaving = false,
    this.error,
  });

  final List<ReflectionQuestion> questions;
  final int currentIndex;
  final Map<int, String> answers; // questionId → text
  final bool isComplete;
  final int? moodAfter;
  final bool isSaving;
  final String? error;

  ReflectionQuestion get currentQuestion => questions[currentIndex];
  bool get isLastQuestion => currentIndex == questions.length - 1;
  String get currentAnswer => answers[currentQuestion.id] ?? '';

  int get answeredCount => answers.values.where((v) => v.trim().isNotEmpty).length;

  ReflectionSessionDraft copyWith({
    int? currentIndex,
    Map<int, String>? answers,
    bool? isComplete,
    Object? moodAfter = _sentinel,
    bool? isSaving,
    Object? error = _sentinel,
  }) =>
      ReflectionSessionDraft(
        questions: questions,
        currentIndex: currentIndex ?? this.currentIndex,
        answers: answers ?? this.answers,
        isComplete: isComplete ?? this.isComplete,
        moodAfter: moodAfter == _sentinel ? this.moodAfter : moodAfter as int?,
        isSaving: isSaving ?? this.isSaving,
        error: error == _sentinel ? this.error : error as String?,
      );
}

const _sentinel = Object();
