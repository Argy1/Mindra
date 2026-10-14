import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/providers/supabase_provider.dart';
import '../../data/datasources/question_bank.dart';
import '../../data/repositories/reflection_repository_impl.dart';
import '../../domain/entities/reflection_entity.dart';

part 'reflection_provider.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Repository provider
// ─────────────────────────────────────────────────────────────────────────────

final reflectionRepositoryProvider = Provider<ReflectionRepositoryImpl>(
  (ref) => ReflectionRepositoryImpl(ref.watch(supabaseProvider)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Night Reflection Session
// ─────────────────────────────────────────────────────────────────────────────

class ReflectionSessionNotifier extends StateNotifier<ReflectionSessionDraft> {
  ReflectionSessionNotifier(this._repo)
      : super(ReflectionSessionDraft(
          questions: questionsForDate(DateTime.now()),
        ));

  final ReflectionRepositoryImpl _repo;

  void updateAnswer(String text) {
    final q = state.currentQuestion;
    final updated = Map<int, String>.from(state.answers)..[q.id] = text;
    state = state.copyWith(answers: updated);
  }

  void next() {
    if (state.isLastQuestion) {
      state = state.copyWith(isComplete: true);
    } else {
      state = state.copyWith(currentIndex: state.currentIndex + 1);
    }
  }

  void skip() {
    // Advance without saving an answer (or save empty)
    if (state.isLastQuestion) {
      state = state.copyWith(isComplete: true);
    } else {
      state = state.copyWith(currentIndex: state.currentIndex + 1);
    }
  }

  void back() {
    if (state.currentIndex > 0) {
      state = state.copyWith(
        currentIndex: state.currentIndex - 1,
        isComplete: false,
      );
    }
  }

  void setMoodAfter(int mood) => state = state.copyWith(moodAfter: mood);

  Future<void> save(String userId) async {
    state = state.copyWith(isSaving: true, error: null);
    try {
      final answers = state.questions
          .where((q) => (state.answers[q.id] ?? '').trim().isNotEmpty)
          .map((q) => ReflectionAnswer(
                questionId: q.id,
                questionText: q.text,
                answer: state.answers[q.id]!.trim(),
                category: q.category,
              ))
          .toList();

      await _repo.saveReflection(
        userId: userId,
        date: DateTime.now(),
        answers: answers,
        moodAfter: state.moodAfter,
      );
      state = state.copyWith(isSaving: false);
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
    }
  }

  void reset() => state = ReflectionSessionDraft(
        questions: questionsForDate(DateTime.now()),
      );
}

final reflectionSessionProvider = StateNotifierProvider.autoDispose<
    ReflectionSessionNotifier, ReflectionSessionDraft>(
  (ref) => ReflectionSessionNotifier(ref.watch(reflectionRepositoryProvider)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Reflection History
// ─────────────────────────────────────────────────────────────────────────────

class ReflectionHistoryState {
  const ReflectionHistoryState({
    this.reflections = const [],
    this.isLoading = false,
    this.selectedDate,
    this.error,
  });

  final List<NightReflection> reflections;
  final bool isLoading;
  final DateTime? selectedDate;
  final String? error;

  Set<String> get completedDates =>
      reflections.map((r) => _dateStr(r.date)).toSet();

  NightReflection? get selectedReflection {
    if (selectedDate == null) return null;
    final key = _dateStr(selectedDate!);
    for (final reflection in reflections) {
      if (_dateStr(reflection.date) == key) {
        return reflection;
      }
    }
    return null;
  }

  static String _dateStr(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  ReflectionHistoryState copyWith({
    List<NightReflection>? reflections,
    bool? isLoading,
    Object? selectedDate = _sentinel,
    String? error,
  }) =>
      ReflectionHistoryState(
        reflections: reflections ?? this.reflections,
        isLoading: isLoading ?? this.isLoading,
        selectedDate: selectedDate == _sentinel
            ? this.selectedDate
            : selectedDate as DateTime?,
        error: error,
      );
}

const _sentinel = Object();

class ReflectionHistoryNotifier extends StateNotifier<ReflectionHistoryState> {
  ReflectionHistoryNotifier(this._repo) : super(const ReflectionHistoryState());

  final ReflectionRepositoryImpl _repo;

  Future<void> load(String userId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final list = await _repo.getReflections(userId: userId);
      state = ReflectionHistoryState(reflections: list);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: errorMessage(e, fallback: 'Gagal memuat riwayat refleksi.'),
      );
    }
  }

  void selectDate(DateTime? date) => state = state.copyWith(selectedDate: date);
}

final reflectionHistoryProvider = StateNotifierProvider.autoDispose<
    ReflectionHistoryNotifier, ReflectionHistoryState>(
  (ref) => ReflectionHistoryNotifier(ref.watch(reflectionRepositoryProvider)),
);
