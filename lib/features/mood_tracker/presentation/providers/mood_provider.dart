import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/services/notification_service.dart';
import '../../../../shared/widgets/mood_glyph.dart';
import '../../domain/entities/mood_entry_entity.dart';
import '../../data/datasources/mood_remote_datasource.dart';
import '../../data/repositories/mood_repository_impl.dart';
import '../../../../core/providers/supabase_provider.dart';

part 'mood_provider.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Generated providers (signatures must not change)
// ─────────────────────────────────────────────────────────────────────────────

@riverpod
MoodRepositoryImpl moodRepository(Ref ref) => MoodRepositoryImpl(
      MoodRemoteDatasourceImpl(ref.watch(supabaseProvider)),
    );

@riverpod
Future<List<MoodEntry>> moodEntries(Ref ref) =>
    ref.watch(moodRepositoryProvider).getEntries();

@riverpod
Future<MoodEntry?> todayMoodEntry(Ref ref) =>
    ref.watch(moodRepositoryProvider).getTodayEntry();

// ─────────────────────────────────────────────────────────────────────────────
// New models & enums
// ─────────────────────────────────────────────────────────────────────────────

enum MoodPeriod { week, month, threeMonths }

// ─────────────────────────────────────────────────────────────────────────────
// Check-in notifier
// ─────────────────────────────────────────────────────────────────────────────

class MoodCheckinState {
  const MoodCheckinState({
    this.selectedMood,
    this.triggers = const [],
    this.note = '',
    this.energyLevel = 3,
    this.isSaving = false,
    this.error,
    this.saved = false,
    this.editingId,
  });

  final MoodType? selectedMood;
  final List<String> triggers;
  final String note;
  final int energyLevel;
  final bool isSaving;
  final String? error;
  final bool saved;
  final String? editingId;

  bool get isEditMode => editingId != null;

  MoodCheckinState copyWith({
    MoodType? selectedMood,
    List<String>? triggers,
    String? note,
    int? energyLevel,
    bool? isSaving,
    String? error,
    bool? saved,
    String? editingId,
  }) =>
      MoodCheckinState(
        selectedMood: selectedMood ?? this.selectedMood,
        triggers: triggers ?? this.triggers,
        note: note ?? this.note,
        energyLevel: energyLevel ?? this.energyLevel,
        isSaving: isSaving ?? this.isSaving,
        error: error ?? this.error,
        saved: saved ?? this.saved,
        editingId: editingId ?? this.editingId,
      );
}

class MoodCheckinNotifier extends StateNotifier<MoodCheckinState> {
  MoodCheckinNotifier(this._ref) : super(const MoodCheckinState());

  final Ref _ref;

  void initFromEntry(MoodEntry entry) {
    if (state.editingId != null) return;
    final mood = MoodType.values.cast<MoodType?>().firstWhere(
          (m) => m?.name == entry.moodType,
          orElse: () => null,
        );
    state = MoodCheckinState(
      selectedMood: mood,
      triggers: List<String>.from(entry.triggers),
      note: entry.note,
      energyLevel: entry.energyLevel ?? 3,
      editingId: entry.id,
    );
  }

  void selectMood(MoodType mood) => state = state.copyWith(selectedMood: mood);

  void toggleTrigger(String trigger) {
    final current = List<String>.from(state.triggers);
    if (current.contains(trigger)) {
      current.remove(trigger);
    } else {
      current.add(trigger);
    }
    state = state.copyWith(triggers: current);
  }

  void setNote(String note) => state = state.copyWith(note: note);

  void setEnergy(int level) => state = state.copyWith(energyLevel: level);

  Future<void> save(String userId) async {
    if (state.selectedMood == null) return;
    state = state.copyWith(isSaving: true, error: null);
    try {
      final entry = MoodEntry(
        id: state.editingId ?? const Uuid().v4(),
        userId: userId,
        moodType: state.selectedMood!.name,
        note: state.note,
        createdAt: DateTime.now(),
        energyLevel: state.energyLevel,
        triggers: state.triggers,
      );
      await _ref.read(moodRepositoryProvider).saveEntry(entry);
      state = state.copyWith(isSaving: false, saved: true);
      _ref.invalidate(moodEntriesProvider);
      _ref.invalidate(todayMoodEntryProvider);
      // The user just checked in — drop today's pending mood reminder.
      unawaited(_suppressTodaysMoodReminder());
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
    }
  }

  /// Re-arms the daily mood reminder with today's occurrence skipped, since
  /// the user has already checked in. Best-effort — silently no-ops when
  /// notifications are unavailable.
  Future<void> _suppressTodaysMoodReminder() async {
    try {
      final svc = NotificationService.instance;
      if (!svc.isInitialized || !svc.hasPermission) return;
      final time = await svc.computeAdaptiveMoodTime();
      await svc.scheduleDailyMoodCheckin(time, hasCheckedInToday: true);
    } catch (e) {
      debugPrint('Gagal menjadwalkan ulang pengingat mood: $e');
      // Notifications are non-critical — never block a mood save on them.
    }
  }
}

final moodCheckinProvider =
    StateNotifierProvider.autoDispose<MoodCheckinNotifier, MoodCheckinState>(
  (ref) => MoodCheckinNotifier(ref),
);

// ─────────────────────────────────────────────────────────────────────────────
// History provider — period-filtered
// ─────────────────────────────────────────────────────────────────────────────

final moodHistoryProvider = FutureProvider.autoDispose
    .family<List<MoodEntry>, MoodPeriod>((ref, period) async {
  final now = DateTime.now();
  final days = switch (period) {
    MoodPeriod.week => 7,
    MoodPeriod.month => 30,
    MoodPeriod.threeMonths => 90,
  };
  final from =
      DateTime(now.year, now.month, now.day).subtract(Duration(days: days - 1));
  return ref.read(moodRepositoryProvider).getEntriesByRange(from, now);
});

// ─────────────────────────────────────────────────────────────────────────────
// Insights provider
// ─────────────────────────────────────────────────────────────────────────────

class MoodInsights {
  const MoodInsights({
    required this.averageScore,
    required this.entryCount,
    required this.mostCommonMood,
    required this.trendDirection,
    required this.bestDayLabel,
    required this.hasData,
  });

  final double averageScore;
  final int entryCount;
  final String? mostCommonMood;
  final int trendDirection; // 1 improving, 0 stable, -1 declining
  final String? bestDayLabel;
  final bool hasData;
}

final moodInsightsProvider = FutureProvider.autoDispose
    .family<MoodInsights, MoodPeriod>((ref, period) async {
  final entries = await ref.watch(moodHistoryProvider(period).future);
  return _computeInsights(entries);
});

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

int moodTypeToScore(String moodType) => switch (moodType) {
      'bahagia' => 7,
      'syukur' => 6,
      'tenang' => 5,
      'hangat' => 4,
      'lelah' => 3,
      'cemas' => 2,
      'sedih' => 1,
      _ => 4,
    };

String moodTypeToEmoji(String moodType) => switch (moodType) {
      'bahagia' => '😄',
      'syukur' => '🙏',
      'tenang' => '😌',
      'hangat' => '🤗',
      'lelah' => '😴',
      'cemas' => '😰',
      'sedih' => '😢',
      _ => '😐',
    };

MoodInsights _computeInsights(List<MoodEntry> entries) {
  if (entries.isEmpty) {
    return const MoodInsights(
      averageScore: 0,
      entryCount: 0,
      mostCommonMood: null,
      trendDirection: 0,
      bestDayLabel: null,
      hasData: false,
    );
  }

  final scores = entries.map((e) => moodTypeToScore(e.moodType)).toList();
  final avg = scores.reduce((a, b) => a + b) / scores.length;

  final moodCounts = <String, int>{};
  for (final e in entries) {
    moodCounts[e.moodType] = (moodCounts[e.moodType] ?? 0) + 1;
  }
  final mostCommon =
      moodCounts.entries.reduce((a, b) => a.value >= b.value ? a : b).key;

  int trendDirection = 0;
  if (entries.length >= 4) {
    final half = entries.length ~/ 2;
    // entries is newest-first from the DB
    final recentAvg = entries
            .take(half)
            .map((e) => moodTypeToScore(e.moodType))
            .reduce((a, b) => a + b) /
        half;
    final olderAvg = entries
            .skip(half)
            .map((e) => moodTypeToScore(e.moodType))
            .reduce((a, b) => a + b) /
        (entries.length - half);
    if (recentAvg - olderAvg > 0.5) {
      trendDirection = 1;
    } else if (olderAvg - recentAvg > 0.5) {
      trendDirection = -1;
    }
  }

  final best = entries.reduce((a, b) =>
      moodTypeToScore(a.moodType) >= moodTypeToScore(b.moodType) ? a : b);
  final bestDayLabel =
      DateFormat('EEEE, d MMM', 'id_ID').format(best.createdAt);

  return MoodInsights(
    averageScore: avg,
    entryCount: entries.length,
    mostCommonMood: mostCommon,
    trendDirection: trendDirection,
    bestDayLabel: bestDayLabel,
    hasData: true,
  );
}
