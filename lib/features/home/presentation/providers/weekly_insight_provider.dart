import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers/supabase_provider.dart';
import '../../data/repositories/weekly_insight_repository_impl.dart';
import '../../domain/entities/weekly_insight_entity.dart';

DateTime _mondayOf(DateTime d) =>
    DateTime(d.year, d.month, d.day - (d.weekday - 1));

class WeeklyInsightState {
  const WeeklyInsightState({
    required this.weekStart,
    this.insight,
    this.isLoading = false,
    this.error,
  });

  final DateTime weekStart;
  final WeeklyInsightData? insight;
  final bool isLoading;
  final String? error;

  bool get canGoNext {
    final next = weekStart.add(const Duration(days: 7));
    final currentMonday = _mondayOf(DateTime.now());
    return next.isBefore(currentMonday) ||
        (next.year == currentMonday.year &&
            next.month == currentMonday.month &&
            next.day == currentMonday.day);
  }
}

class WeeklyInsightNotifier
    extends StateNotifier<WeeklyInsightState> {
  WeeklyInsightNotifier(this._repo, this._userId)
      : super(WeeklyInsightState(
          weekStart: _mondayOf(DateTime.now()),
          isLoading: true,
        )) {
    _load();
  }

  final WeeklyInsightRepositoryImpl _repo;
  final String _userId;

  Future<void> _load() async {
    final ws = state.weekStart;
    state = WeeklyInsightState(weekStart: ws, isLoading: true);
    try {
      final data = await _repo.getWeeklyInsight(
        userId: _userId,
        weekStart: ws,
      );
      if (mounted) {
        state = WeeklyInsightState(weekStart: ws, insight: data);
      }
    } catch (e) {
      if (mounted) {
        state = WeeklyInsightState(
            weekStart: ws, error: e.toString());
      }
    }
  }

  void prevWeek() {
    state = WeeklyInsightState(
      weekStart: state.weekStart.subtract(const Duration(days: 7)),
    );
    _load();
  }

  void nextWeek() {
    if (!state.canGoNext) return;
    state = WeeklyInsightState(
      weekStart: state.weekStart.add(const Duration(days: 7)),
    );
    _load();
  }

  void refresh() => _load();
}

final weeklyInsightProvider = StateNotifierProvider.autoDispose<
    WeeklyInsightNotifier, WeeklyInsightState>((ref) {
  final client = ref.watch(supabaseProvider);
  final userId = client.auth.currentUser?.id ?? '';
  final repo = WeeklyInsightRepositoryImpl(client);
  return WeeklyInsightNotifier(repo, userId);
});
