import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/providers/supabase_provider.dart';
import '../../../mood_tracker/presentation/providers/mood_provider.dart';
import '../../data/datasources/sleep_remote_datasource.dart';
import '../../data/repositories/sleep_repository_impl.dart';
import '../../domain/entities/sleep_entry_entity.dart';

part 'sleep_provider.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Generated providers (signatures must not change)
// ─────────────────────────────────────────────────────────────────────────────

@riverpod
SleepRepositoryImpl sleepRepository(Ref ref) => SleepRepositoryImpl(
      SleepRemoteDatasourceImpl(ref.watch(supabaseProvider)),
    );

@riverpod
Future<List<SleepEntry>> sleepEntries(Ref ref) =>
    ref.watch(sleepRepositoryProvider).getEntries();

// ─────────────────────────────────────────────────────────────────────────────
// Check-in state & notifier
// ─────────────────────────────────────────────────────────────────────────────

class SleepCheckinState {
  const SleepCheckinState({
    this.bedtime,
    this.wakeTime,
    this.quality = 3,
    this.notes = '',
    this.isSaving = false,
    this.error,
    this.saved = false,
    this.editingId,
  });

  final TimeOfDay? bedtime;
  final TimeOfDay? wakeTime;
  final int quality; // 1–5
  final String notes;
  final bool isSaving;
  final String? error;
  final bool saved;
  final String? editingId;

  bool get isEditMode => editingId != null;
  bool get canSave => bedtime != null && wakeTime != null;

  Duration? get duration {
    if (bedtime == null || wakeTime == null) return null;
    final bedMin = bedtime!.hour * 60 + bedtime!.minute;
    var wakeMin = wakeTime!.hour * 60 + wakeTime!.minute;
    if (wakeMin <= bedMin) wakeMin += 24 * 60; // next day
    return Duration(minutes: wakeMin - bedMin);
  }

  SleepCheckinState copyWith({
    TimeOfDay? bedtime,
    TimeOfDay? wakeTime,
    int? quality,
    String? notes,
    bool? isSaving,
    String? error,
    bool? saved,
    String? editingId,
  }) =>
      SleepCheckinState(
        bedtime: bedtime ?? this.bedtime,
        wakeTime: wakeTime ?? this.wakeTime,
        quality: quality ?? this.quality,
        notes: notes ?? this.notes,
        isSaving: isSaving ?? this.isSaving,
        error: error ?? this.error,
        saved: saved ?? this.saved,
        editingId: editingId ?? this.editingId,
      );
}

class SleepCheckinNotifier extends StateNotifier<SleepCheckinState> {
  SleepCheckinNotifier(this._ref) : super(const SleepCheckinState());

  final Ref _ref;

  void initFromEntry(SleepEntry entry) {
    if (state.editingId != null) return;
    state = SleepCheckinState(
      bedtime: TimeOfDay.fromDateTime(entry.bedtime),
      wakeTime: TimeOfDay.fromDateTime(entry.wakeTime),
      quality: entry.quality,
      notes: entry.notes,
      editingId: entry.id,
    );
  }

  void setBedtime(TimeOfDay t) => state = state.copyWith(bedtime: t);
  void setWakeTime(TimeOfDay t) => state = state.copyWith(wakeTime: t);
  void setQuality(int q) => state = state.copyWith(quality: q);
  void setNotes(String n) => state = state.copyWith(notes: n);

  Future<void> save(String userId) async {
    if (!state.canSave) return;
    state = state.copyWith(isSaving: true, error: null);
    try {
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);

      // If bedtime hour >= 12 (noon), it was last night; otherwise early this morning.
      final bedDate = state.bedtime!.hour >= 12
          ? today.subtract(const Duration(days: 1))
          : today;
      final bedtime = bedDate.add(Duration(
        hours: state.bedtime!.hour,
        minutes: state.bedtime!.minute,
      ));
      final wakeTime = today.add(Duration(
        hours: state.wakeTime!.hour,
        minutes: state.wakeTime!.minute,
      ));

      final entry = SleepEntry(
        id: state.editingId ?? const Uuid().v4(),
        userId: userId,
        bedtime: bedtime,
        wakeTime: wakeTime,
        quality: state.quality,
        notes: state.notes,
      );
      await _ref.read(sleepRepositoryProvider).saveEntry(entry);
      state = state.copyWith(isSaving: false, saved: true);
      _ref.invalidate(sleepEntriesProvider);
      _ref.invalidate(todaysSleepProvider);
      _ref.invalidate(sleepHistoryProvider);
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
    }
  }
}

final sleepCheckinProvider =
    StateNotifierProvider.autoDispose<SleepCheckinNotifier, SleepCheckinState>(
  (ref) => SleepCheckinNotifier(ref),
);

// ─────────────────────────────────────────────────────────────────────────────
// Today's sleep
// ─────────────────────────────────────────────────────────────────────────────

final todaysSleepProvider =
    FutureProvider.autoDispose<SleepEntry?>((ref) async {
  final entries = await ref.watch(sleepEntriesProvider.future);
  if (entries.isEmpty) return null;
  final e = entries.first;
  final now = DateTime.now();
  return e.wakeTime.year == now.year &&
          e.wakeTime.month == now.month &&
          e.wakeTime.day == now.day
      ? e
      : null;
});

// ─────────────────────────────────────────────────────────────────────────────
// History (last 30 days)
// ─────────────────────────────────────────────────────────────────────────────

final sleepHistoryProvider =
    FutureProvider.autoDispose<List<SleepEntry>>((ref) async {
  final now = DateTime.now();
  final from =
      DateTime(now.year, now.month, now.day).subtract(const Duration(days: 29));
  return ref.read(sleepRepositoryProvider).getEntriesByRange(from, now);
});

// ─────────────────────────────────────────────────────────────────────────────
// Sleep–mood correlation
// ─────────────────────────────────────────────────────────────────────────────

class SleepMoodCorrelation {
  const SleepMoodCorrelation({
    required this.avgMoodLongSleep,
    required this.avgMoodShortSleep,
    required this.longSleepCount,
    required this.shortSleepCount,
    required this.hasData,
  });

  final double avgMoodLongSleep; // sleep >= 7h
  final double avgMoodShortSleep; // sleep < 7h
  final int longSleepCount;
  final int shortSleepCount;
  final bool hasData;

  String get longSleepMoodLabel {
    if (avgMoodLongSleep >= 6) return 'Sangat Baik';
    if (avgMoodLongSleep >= 5) return 'Baik';
    if (avgMoodLongSleep >= 4) return 'Cukup';
    return 'Kurang';
  }

  String get shortSleepMoodLabel {
    if (avgMoodShortSleep >= 6) return 'Sangat Baik';
    if (avgMoodShortSleep >= 5) return 'Baik';
    if (avgMoodShortSleep >= 4) return 'Cukup';
    return 'Kurang';
  }
}

final sleepMoodCorrelationProvider =
    FutureProvider.autoDispose<SleepMoodCorrelation>((ref) async {
  final sleepEntries = await ref.watch(sleepHistoryProvider.future);
  final moodEntries = await ref.watch(moodEntriesProvider.future);

  if (sleepEntries.isEmpty || moodEntries.isEmpty) {
    return const SleepMoodCorrelation(
      avgMoodLongSleep: 0,
      avgMoodShortSleep: 0,
      longSleepCount: 0,
      shortSleepCount: 0,
      hasData: false,
    );
  }

  // Index mood by wake date
  final moodByDate = <String, int>{};
  for (final m in moodEntries) {
    final key = '${m.createdAt.year}-${m.createdAt.month}-${m.createdAt.day}';
    moodByDate[key] = moodTypeToScore(m.moodType);
  }

  double longSum = 0;
  int longCount = 0;
  double shortSum = 0;
  int shortCount = 0;

  for (final s in sleepEntries) {
    final key = '${s.wakeTime.year}-${s.wakeTime.month}-${s.wakeTime.day}';
    final moodScore = moodByDate[key];
    if (moodScore == null) continue;

    final hours = s.duration.inMinutes / 60;
    if (hours >= 7) {
      longSum += moodScore;
      longCount++;
    } else {
      shortSum += moodScore;
      shortCount++;
    }
  }

  if (longCount == 0 && shortCount == 0) {
    return const SleepMoodCorrelation(
      avgMoodLongSleep: 0,
      avgMoodShortSleep: 0,
      longSleepCount: 0,
      shortSleepCount: 0,
      hasData: false,
    );
  }

  return SleepMoodCorrelation(
    avgMoodLongSleep: longCount > 0 ? longSum / longCount : 0,
    avgMoodShortSleep: shortCount > 0 ? shortSum / shortCount : 0,
    longSleepCount: longCount,
    shortSleepCount: shortCount,
    hasData: true,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Duration helpers (shared with screens)
// ─────────────────────────────────────────────────────────────────────────────

String formatDuration(Duration d) {
  final h = d.inHours;
  final m = d.inMinutes % 60;
  if (m == 0) return '$h jam';
  return '$h jam $m menit';
}

Color durationColor(Duration d) {
  final hours = d.inMinutes / 60;
  if (hours >= 7 && hours <= 9) return const Color(0xFF4A9E8F); // sage500
  if (hours >= 6) return const Color(0xFFE07B00); // matahari500
  return const Color(0xFFC0392B); // danger500
}

Color qualityBarColor(int quality) {
  if (quality >= 4) return const Color(0xFF4A9E8F); // sage500 green
  if (quality == 3) return const Color(0xFFE07B00); // matahari500 yellow
  return const Color(0xFFC0392B); // danger500 red
}
