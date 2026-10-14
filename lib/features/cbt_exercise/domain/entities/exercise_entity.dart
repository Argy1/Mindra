// ─────────────────────────────────────────────────────────────────────────────
// CBT Exercise — Domain Entities
// ─────────────────────────────────────────────────────────────────────────────

enum CbtExerciseType {
  thoughtRecord,
  behavioralActivation,
  pmr,
  guidedBreathing
}

extension CbtExerciseTypeX on CbtExerciseType {
  String get id => switch (this) {
        CbtExerciseType.thoughtRecord => 'thought_record',
        CbtExerciseType.behavioralActivation => 'behavioral_activation',
        CbtExerciseType.pmr => 'pmr',
        CbtExerciseType.guidedBreathing => 'breathing',
      };

  String get title => switch (this) {
        CbtExerciseType.thoughtRecord => 'Thought Record',
        CbtExerciseType.behavioralActivation => 'Behavioral Activation',
        CbtExerciseType.pmr => 'Progressive Muscle Relaxation',
        CbtExerciseType.guidedBreathing => 'Guided Breathing',
      };

  String get subtitle => switch (this) {
        CbtExerciseType.thoughtRecord => 'Kenali & Tantang Pikiran Negatif',
        CbtExerciseType.behavioralActivation => 'Aktifkan Dirimu',
        CbtExerciseType.pmr => 'Rilekskan Tubuhmu',
        CbtExerciseType.guidedBreathing => 'Napas 4-7-8',
      };

  String get emoji => switch (this) {
        CbtExerciseType.thoughtRecord => '🧠',
        CbtExerciseType.behavioralActivation => '⚡',
        CbtExerciseType.pmr => '🌿',
        CbtExerciseType.guidedBreathing => '🫧',
      };

  String get durationLabel => switch (this) {
        CbtExerciseType.thoughtRecord => '10–15 menit',
        CbtExerciseType.behavioralActivation => '5 menit',
        CbtExerciseType.pmr => '15 menit',
        CbtExerciseType.guidedBreathing => '5 menit',
      };

  String get forLabel => switch (this) {
        CbtExerciseType.thoughtRecord => 'Evidence-based: CBT',
        CbtExerciseType.behavioralActivation => 'Untuk: Depresi ringan',
        CbtExerciseType.pmr => 'Untuk: Stres, Kecemasan',
        CbtExerciseType.guidedBreathing => 'Untuk: Kecemasan akut',
      };

  static CbtExerciseType fromId(String id) => CbtExerciseType.values.firstWhere(
        (e) => e.id == id,
        orElse: () => CbtExerciseType.guidedBreathing,
      );
}

// ─── Emotion ─────────────────────────────────────────────────────────────────

class EmotionEntry {
  const EmotionEntry(
      {required this.label, required this.emoji, this.intensity = 50});

  final String label;
  final String emoji;
  final int intensity; // 0–100

  EmotionEntry withIntensity(int v) =>
      EmotionEntry(label: label, emoji: emoji, intensity: v.clamp(0, 100));

  Map<String, dynamic> toJson() =>
      {'label': label, 'emoji': emoji, 'intensity': intensity};

  factory EmotionEntry.fromJson(Map<String, dynamic> j) => EmotionEntry(
        label: j['label'] as String,
        emoji: j['emoji'] as String,
        intensity: (j['intensity'] as num?)?.toInt() ?? 50,
      );
}

const kAvailableEmotions = [
  EmotionEntry(label: 'Sedih', emoji: '😢'),
  EmotionEntry(label: 'Cemas', emoji: '😰'),
  EmotionEntry(label: 'Marah', emoji: '😠'),
  EmotionEntry(label: 'Malu', emoji: '😳'),
  EmotionEntry(label: 'Takut', emoji: '😨'),
  EmotionEntry(label: 'Lainnya', emoji: '💭'),
];

// ─── Thought Record Draft (multi-step form state) ────────────────────────────

class ThoughtRecordDraft {
  const ThoughtRecordDraft({
    this.situation = '',
    this.emotions = const [],
    this.automaticThought = '',
    this.supportingEvidence = const [],
    this.counterEvidence = const [],
    this.balancedThought = '',
    this.beliefScore = 50,
    this.afterEmotions = const [],
    this.currentStep = 0,
    this.isSaving = false,
    this.savedId,
    this.error,
  });

  final String situation;
  final List<EmotionEntry> emotions;
  final String automaticThought;
  final List<String> supportingEvidence;
  final List<String> counterEvidence;
  final String balancedThought;
  final int beliefScore;
  final List<EmotionEntry> afterEmotions;
  final int currentStep;
  final bool isSaving;
  final String? savedId;
  final String? error;

  bool get canAdvance => switch (currentStep) {
        0 => situation.trim().isNotEmpty,
        1 => emotions.isNotEmpty,
        2 => automaticThought.trim().isNotEmpty,
        3 => supportingEvidence.isNotEmpty,
        4 => counterEvidence.isNotEmpty,
        5 => balancedThought.trim().isNotEmpty && afterEmotions.isNotEmpty,
        _ => true,
      };

  ThoughtRecordDraft copyWith({
    String? situation,
    List<EmotionEntry>? emotions,
    String? automaticThought,
    List<String>? supportingEvidence,
    List<String>? counterEvidence,
    String? balancedThought,
    int? beliefScore,
    List<EmotionEntry>? afterEmotions,
    int? currentStep,
    bool? isSaving,
    Object? savedId = _sentinel,
    Object? error = _sentinel,
  }) =>
      ThoughtRecordDraft(
        situation: situation ?? this.situation,
        emotions: emotions ?? this.emotions,
        automaticThought: automaticThought ?? this.automaticThought,
        supportingEvidence: supportingEvidence ?? this.supportingEvidence,
        counterEvidence: counterEvidence ?? this.counterEvidence,
        balancedThought: balancedThought ?? this.balancedThought,
        beliefScore: beliefScore ?? this.beliefScore,
        afterEmotions: afterEmotions ?? this.afterEmotions,
        currentStep: currentStep ?? this.currentStep,
        isSaving: isSaving ?? this.isSaving,
        savedId: savedId == _sentinel ? this.savedId : savedId as String?,
        error: error == _sentinel ? this.error : error as String?,
      );
}

const _sentinel = Object();

// ─── Saved Thought Record ─────────────────────────────────────────────────────

class ThoughtRecord {
  const ThoughtRecord({
    required this.id,
    required this.userId,
    required this.createdAt,
    required this.situation,
    required this.emotions,
    required this.automaticThought,
    required this.supportingEvidence,
    required this.counterEvidence,
    required this.balancedThought,
    required this.beliefScore,
    required this.afterEmotions,
  });

  final String id;
  final String userId;
  final DateTime createdAt;
  final String situation;
  final List<EmotionEntry> emotions;
  final String automaticThought;
  final List<String> supportingEvidence;
  final List<String> counterEvidence;
  final String balancedThought;
  final int beliefScore;
  final List<EmotionEntry> afterEmotions;
}

// ─── Behavioral Activation ────────────────────────────────────────────────────

enum ActivityCategory { fisik, sosial, kreatif, perawatanDiri, produktif }

extension ActivityCategoryX on ActivityCategory {
  String get label => switch (this) {
        ActivityCategory.fisik => 'Fisik',
        ActivityCategory.sosial => 'Sosial',
        ActivityCategory.kreatif => 'Kreatif',
        ActivityCategory.perawatanDiri => 'Perawatan Diri',
        ActivityCategory.produktif => 'Produktif',
      };
  String get emoji => switch (this) {
        ActivityCategory.fisik => '🏃',
        ActivityCategory.sosial => '🤝',
        ActivityCategory.kreatif => '🎨',
        ActivityCategory.perawatanDiri => '🛁',
        ActivityCategory.produktif => '📚',
      };
}

class ActivityItem {
  const ActivityItem({
    required this.id,
    required this.label,
    required this.category,
    this.isCompleted = false,
    this.isCustom = false,
  });

  final String id;
  final String label;
  final ActivityCategory category;
  final bool isCompleted;
  final bool isCustom;

  ActivityItem withCompleted(bool v) => ActivityItem(
        id: id,
        label: label,
        category: category,
        isCompleted: v,
        isCustom: isCustom,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'category': category.name,
        'is_completed': isCompleted,
        'is_custom': isCustom,
      };

  factory ActivityItem.fromJson(Map<String, dynamic> j) => ActivityItem(
        id: j['id'] as String,
        label: j['label'] as String,
        category: ActivityCategory.values.firstWhere(
          (c) => c.name == j['category'],
          orElse: () => ActivityCategory.produktif,
        ),
        isCompleted: j['is_completed'] as bool? ?? false,
        isCustom: j['is_custom'] as bool? ?? false,
      );
}

// ─── Exercise Session (streak tracking) ───────────────────────────────────────

class ExerciseSession {
  const ExerciseSession({
    required this.id,
    required this.userId,
    required this.exerciseType,
    required this.completedAt,
  });

  final String id;
  final String userId;
  final String exerciseType;
  final DateTime completedAt;
}

// ─── Keep old entity for backward compat with exercise_model.dart ─────────────

enum ExerciseCategory {
  thoughtRecord,
  behavioralActivation,
  relaxation,
  mindfulness
}

class CbtExercise {
  const CbtExercise({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.durationMinutes,
    required this.steps,
  });

  final String id;
  final String title;
  final String description;
  final ExerciseCategory category;
  final int durationMinutes;
  final List<String> steps;
}
