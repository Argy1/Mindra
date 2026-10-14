import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../data/repositories/exercise_repository_impl.dart';
import '../../domain/entities/exercise_entity.dart';

part 'exercise_provider.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Repository provider
// ─────────────────────────────────────────────────────────────────────────────

final exerciseRepositoryProvider = Provider<ExerciseRepositoryImpl>(
  (ref) => ExerciseRepositoryImpl(ref.watch(supabaseProvider)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Streak state
// ─────────────────────────────────────────────────────────────────────────────

class StreakState {
  const StreakState({
    this.streaks = const {},
    this.isLoading = false,
    this.error,
  });

  final Map<String, int> streaks;
  final bool isLoading;
  final String? error;

  int streakFor(CbtExerciseType type) => streaks[type.id] ?? 0;

  StreakState copyWith({
    Map<String, int>? streaks,
    bool? isLoading,
    String? error,
  }) =>
      StreakState(
        streaks: streaks ?? this.streaks,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class StreakNotifier extends StateNotifier<StreakState> {
  StreakNotifier(this._repo) : super(const StreakState());

  final ExerciseRepositoryImpl _repo;

  Future<void> load(String userId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final s = await _repo.getStreaks(userId);
      state = StreakState(streaks: s, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: errorMessage(e, fallback: 'Gagal memuat streak latihan.'),
      );
    }
  }

  Future<void> markComplete(String userId, CbtExerciseType type) async {
    state = state.copyWith(error: null);
    try {
      await _repo.markExerciseComplete(userId, type.id);
      await load(userId);
    } catch (e) {
      state = state.copyWith(
        error: errorMessage(e, fallback: 'Gagal menyimpan progres latihan.'),
      );
    }
  }
}

final streakProvider =
    StateNotifierProvider.autoDispose<StreakNotifier, StreakState>(
  (ref) => StreakNotifier(ref.watch(exerciseRepositoryProvider)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Thought Record state
// ─────────────────────────────────────────────────────────────────────────────

class ThoughtRecordNotifier extends StateNotifier<ThoughtRecordDraft> {
  ThoughtRecordNotifier(this._repo) : super(const ThoughtRecordDraft());

  final ExerciseRepositoryImpl _repo;

  void setSituation(String v) => state = state.copyWith(situation: v);

  void toggleEmotion(EmotionEntry e) {
    final list = List<EmotionEntry>.from(state.emotions);
    final idx = list.indexWhere((x) => x.label == e.label);
    if (idx >= 0) {
      list.removeAt(idx);
    } else {
      list.add(e);
    }
    state = state.copyWith(emotions: list);
  }

  void setEmotionIntensity(String label, int intensity) {
    final list = state.emotions
        .map((e) => e.label == label ? e.withIntensity(intensity) : e)
        .toList();
    state = state.copyWith(emotions: list);
  }

  void setAutomaticThought(String v) =>
      state = state.copyWith(automaticThought: v);

  void addSupportingEvidence(String v) {
    if (v.trim().isEmpty) return;
    state = state
        .copyWith(supportingEvidence: [...state.supportingEvidence, v.trim()]);
  }

  void removeSupportingEvidence(int i) {
    final list = List<String>.from(state.supportingEvidence)..removeAt(i);
    state = state.copyWith(supportingEvidence: list);
  }

  void addCounterEvidence(String v) {
    if (v.trim().isEmpty) return;
    state =
        state.copyWith(counterEvidence: [...state.counterEvidence, v.trim()]);
  }

  void removeCounterEvidence(int i) {
    final list = List<String>.from(state.counterEvidence)..removeAt(i);
    state = state.copyWith(counterEvidence: list);
  }

  void setBalancedThought(String v) =>
      state = state.copyWith(balancedThought: v);
  void setBeliefScore(int v) => state = state.copyWith(beliefScore: v);

  void toggleAfterEmotion(EmotionEntry e) {
    final list = List<EmotionEntry>.from(state.afterEmotions);
    final idx = list.indexWhere((x) => x.label == e.label);
    if (idx >= 0) {
      list.removeAt(idx);
    } else {
      list.add(e);
    }
    state = state.copyWith(afterEmotions: list);
  }

  void setAfterEmotionIntensity(String label, int intensity) {
    final list = state.afterEmotions
        .map((e) => e.label == label ? e.withIntensity(intensity) : e)
        .toList();
    state = state.copyWith(afterEmotions: list);
  }

  void nextStep() {
    if (state.currentStep < 5) {
      state = state.copyWith(currentStep: state.currentStep + 1);
    }
  }

  void prevStep() {
    if (state.currentStep > 0) {
      state = state.copyWith(currentStep: state.currentStep - 1);
    }
  }

  Future<void> save(String userId) async {
    state = state.copyWith(isSaving: true, error: null);
    try {
      final id = await _repo.saveThoughtRecord(state, userId);
      state = state.copyWith(isSaving: false, savedId: id);
      await _repo.markExerciseComplete(
          userId, CbtExerciseType.thoughtRecord.id);
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: errorMessage(e, fallback: 'Gagal menyimpan thought record.'),
      );
    }
  }

  void reset() => state = const ThoughtRecordDraft();
}

final thoughtRecordProvider = StateNotifierProvider.autoDispose<
    ThoughtRecordNotifier, ThoughtRecordDraft>(
  (ref) => ThoughtRecordNotifier(ref.watch(exerciseRepositoryProvider)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Behavioral Activation state
// ─────────────────────────────────────────────────────────────────────────────

class BehavioralActivationState {
  const BehavioralActivationState({
    this.activities = const [],
    this.weeklyStats = const [],
    this.isLoading = false,
    this.activeCategory,
    this.error,
  });

  final List<ActivityItem> activities;
  final List<Map<String, dynamic>> weeklyStats;
  final bool isLoading;
  final ActivityCategory? activeCategory;
  final String? error;

  List<ActivityItem> get filtered => activeCategory == null
      ? activities
      : activities.where((a) => a.category == activeCategory).toList();

  int get completedCount => activities.where((a) => a.isCompleted).length;
  double get completionRate =>
      activities.isEmpty ? 0 : completedCount / activities.length;

  BehavioralActivationState copyWith({
    List<ActivityItem>? activities,
    List<Map<String, dynamic>>? weeklyStats,
    bool? isLoading,
    Object? activeCategory = _sentinel,
    String? error,
  }) =>
      BehavioralActivationState(
        activities: activities ?? this.activities,
        weeklyStats: weeklyStats ?? this.weeklyStats,
        isLoading: isLoading ?? this.isLoading,
        activeCategory: activeCategory == _sentinel
            ? this.activeCategory
            : activeCategory as ActivityCategory?,
        error: error,
      );
}

const _sentinel = Object();

class BehavioralActivationNotifier
    extends StateNotifier<BehavioralActivationState> {
  BehavioralActivationNotifier(this._repo)
      : super(const BehavioralActivationState());

  final ExerciseRepositoryImpl _repo;
  String? _userId;

  Future<void> load(String userId) async {
    _userId = userId;
    state = state.copyWith(isLoading: true, error: null);
    try {
      final today = DateTime.now();
      final weekStart = today.subtract(Duration(days: today.weekday - 1));
      final activities = await _repo.getActivityLog(userId, today);
      final stats = await _repo.getWeeklyActivityStats(userId, weekStart);
      state = BehavioralActivationState(
        activities: activities,
        weeklyStats: stats,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: errorMessage(e, fallback: 'Gagal memuat aktivitas.'),
      );
    }
  }

  void toggleActivity(String id) {
    final list = state.activities.map((a) {
      if (a.id == id) return a.withCompleted(!a.isCompleted);
      return a;
    }).toList();
    state = state.copyWith(activities: list);
    _autosave();
  }

  void addCustomActivity(String label, ActivityCategory category) {
    final newItem = ActivityItem(
      id: 'custom_${DateTime.now().millisecondsSinceEpoch}',
      label: label,
      category: category,
      isCustom: true,
    );
    state = state.copyWith(activities: [...state.activities, newItem]);
    _autosave();
  }

  void setFilter(ActivityCategory? cat) =>
      state = state.copyWith(activeCategory: cat);

  void _autosave() {
    if (_userId == null) return;
    _repo
        .saveActivityLog(_userId!, DateTime.now(), state.activities)
        .catchError(
      (Object e) {
        state = state.copyWith(
          error: errorMessage(e, fallback: 'Gagal menyimpan aktivitas.'),
        );
      },
    );
  }

  Future<void> markComplete(String userId) async {
    try {
      await _repo.markExerciseComplete(
        userId,
        CbtExerciseType.behavioralActivation.id,
      );
    } catch (e) {
      state = state.copyWith(
        error: errorMessage(e, fallback: 'Gagal menyimpan progres latihan.'),
      );
    }
  }
}

final behavioralActivationProvider = StateNotifierProvider.autoDispose<
    BehavioralActivationNotifier, BehavioralActivationState>(
  (ref) => BehavioralActivationNotifier(ref.watch(exerciseRepositoryProvider)),
);
