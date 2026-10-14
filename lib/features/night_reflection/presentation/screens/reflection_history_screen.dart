import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/reflection_entity.dart';
import '../providers/reflection_provider.dart';

class ReflectionHistoryScreen extends ConsumerStatefulWidget {
  const ReflectionHistoryScreen({super.key});

  @override
  ConsumerState<ReflectionHistoryScreen> createState() =>
      _ReflectionHistoryScreenState();
}

class _ReflectionHistoryScreenState
    extends ConsumerState<ReflectionHistoryScreen> {
  late DateTime _viewMonth;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _viewMonth = DateTime(now.year, now.month);
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final state = ref.watch(reflectionHistoryProvider);
    final notifier = ref.read(reflectionHistoryProvider.notifier);

    if (!_loaded && user != null) {
      _loaded = true;
      WidgetsBinding.instance
          .addPostFrameCallback((_) => notifier.load(user.id));
    }

    final selected = state.selectedReflection;

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text('Riwayat Refleksi', style: AppTextStyles.h3),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? _HistoryErrorView(
                  message: state.error!,
                  onRetry: user == null ? null : () => notifier.load(user.id),
                )
              : Column(
                  children: [
                    // Calendar
                    _CalendarView(
                      viewMonth: _viewMonth,
                      completedDates: state.completedDates,
                      selectedDate: state.selectedDate,
                      onMonthChanged: (m) => setState(() => _viewMonth = m),
                      onDateSelected: (d) => notifier.selectDate(
                        state.selectedDate != null &&
                                _dateStr(state.selectedDate!) == _dateStr(d)
                            ? null
                            : d,
                      ),
                    ),

                    const Divider(height: 1),

                    // Detail / list
                    Expanded(
                      child: selected != null
                          ? _ReflectionDetail(
                              reflection: selected,
                              onClose: () => notifier.selectDate(null))
                          : _ReflectionList(
                              reflections: state.reflections,
                              onSelect: (r) => notifier.selectDate(r.date),
                            ),
                    ),
                  ],
                ),
    );
  }

  static String _dateStr(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

class _HistoryErrorView extends StatelessWidget {
  const _HistoryErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 56,
              color: AppColors.danger500,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              style: AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: onRetry,
                child: const Text('Coba lagi'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CalendarView extends StatelessWidget {
  const _CalendarView({
    required this.viewMonth,
    required this.completedDates,
    required this.selectedDate,
    required this.onMonthChanged,
    required this.onDateSelected,
  });

  final DateTime viewMonth;
  final Set<String> completedDates;
  final DateTime? selectedDate;
  final void Function(DateTime) onMonthChanged;
  final void Function(DateTime) onDateSelected;

  String _dateKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  bool _isSelected(DateTime d) =>
      selectedDate != null && _dateKey(d) == _dateKey(selectedDate!);

  bool _isCompleted(DateTime d) => completedDates.contains(_dateKey(d));

  bool _isToday(DateTime d) {
    final now = DateTime.now();
    return d.year == now.year && d.month == now.month && d.day == now.day;
  }

  @override
  Widget build(BuildContext context) {
    final firstDay = DateTime(viewMonth.year, viewMonth.month, 1);
    final daysInMonth = DateTime(viewMonth.year, viewMonth.month + 1, 0).day;
    final startWeekday = firstDay.weekday % 7; // 0=Sun

    return Container(
      color: AppColors.surfaceCard,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Column(
        children: [
          // Month nav
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: () => onMonthChanged(
                    DateTime(viewMonth.year, viewMonth.month - 1)),
                color: AppColors.fg2,
              ),
              Expanded(
                child: Text(
                  DateFormat('MMMM yyyy', 'id_ID').format(viewMonth),
                  style: AppTextStyles.h4.copyWith(color: AppColors.fg1),
                  textAlign: TextAlign.center,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: () => onMonthChanged(
                    DateTime(viewMonth.year, viewMonth.month + 1)),
                color: AppColors.fg2,
              ),
            ],
          ),

          // Day headers
          Row(
            children: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
                .map((d) => Expanded(
                      child: Text(
                        d,
                        textAlign: TextAlign.center,
                        style: AppTextStyles.label
                            .copyWith(color: AppColors.fg4, fontSize: 11),
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 8),

          // Day grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: 4,
              crossAxisSpacing: 4,
            ),
            itemCount: startWeekday + daysInMonth,
            itemBuilder: (_, i) {
              if (i < startWeekday) return const SizedBox();
              final day = i - startWeekday + 1;
              final date = DateTime(viewMonth.year, viewMonth.month, day);
              final completed = _isCompleted(date);
              final selected = _isSelected(date);
              final today = _isToday(date);

              return GestureDetector(
                onTap: completed ? () => onDateSelected(date) : null,
                child: Container(
                  decoration: BoxDecoration(
                    color: selected
                        ? AppColors.neutral900
                        : today
                            ? AppColors.biru50
                            : Colors.transparent,
                    shape: BoxShape.circle,
                    border: today && !selected
                        ? Border.all(color: AppColors.biru300, width: 1.5)
                        : null,
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Text(
                        '$day',
                        style: TextStyle(
                          fontSize: 13,
                          color: selected
                              ? Colors.white
                              : completed
                                  ? AppColors.fg1
                                  : AppColors.fg4,
                          fontWeight: completed || today
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                      if (completed && !selected)
                        Positioned(
                          bottom: 4,
                          child: Container(
                            width: 5,
                            height: 5,
                            decoration: const BoxDecoration(
                              color: AppColors.sage500,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),

          // Legend
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                      color: AppColors.sage500, shape: BoxShape.circle)),
              const SizedBox(width: 5),
              Text('Refleksi tersimpan',
                  style: AppTextStyles.label
                      .copyWith(color: AppColors.fg4, fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Reflection list ──────────────────────────────────────────────────────────

class _ReflectionList extends StatelessWidget {
  const _ReflectionList({required this.reflections, required this.onSelect});
  final List<NightReflection> reflections;
  final void Function(NightReflection) onSelect;

  @override
  Widget build(BuildContext context) {
    if (reflections.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.nights_stay_outlined,
                size: 56, color: AppColors.fg4),
            const SizedBox(height: 12),
            Text('Belum ada refleksi malam.',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4)),
            const SizedBox(height: 4),
            Text('Mulai refleksi pertamamu malam ini.',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: reflections.length,
      itemBuilder: (_, i) {
        final r = reflections[i];
        final dateLabel =
            DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(r.date);
        final categories =
            r.answers.map((a) => a.category.emoji).toSet().join(' ');

        return InkWell(
          onTap: () => onSelect(r),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderSoft),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.neutral900,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      '${r.date.day}',
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 18),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(dateLabel,
                          style: AppTextStyles.bodyM.copyWith(
                              color: AppColors.fg1,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(height: 3),
                      Text('${r.answers.length} jawaban · $categories',
                          style: AppTextStyles.label
                              .copyWith(color: AppColors.fg4, fontSize: 12)),
                      if (r.moodAfter != null) ...[
                        const SizedBox(height: 4),
                        Text(_moodLabel(r.moodAfter!),
                            style: AppTextStyles.label.copyWith(
                                color: AppColors.sage500, fontSize: 12)),
                      ],
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.fg4, size: 20),
              ],
            ),
          ),
        );
      },
    );
  }

  String _moodLabel(int v) => switch (v) {
        1 => '😔 Lebih berat',
        2 => '😐 Sama saja',
        3 => '🙂 Sedikit lebih baik',
        4 => '😊 Lebih baik',
        5 => '😌 Jauh lebih tenang',
        _ => '',
      };
}

// ─── Reflection detail ────────────────────────────────────────────────────────

class _ReflectionDetail extends StatelessWidget {
  const _ReflectionDetail({required this.reflection, required this.onClose});
  final NightReflection reflection;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final dateLabel =
        DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(reflection.date);

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: AppColors.surfaceCard,
          child: Row(
            children: [
              Text(dateLabel,
                  style: AppTextStyles.h4.copyWith(color: AppColors.fg1)),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: onClose,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (reflection.moodAfter != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.sage50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.sage500.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.mood_outlined,
                          color: AppColors.sage500, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Perasaan setelah refleksi: ${_moodLabel(reflection.moodAfter!)}',
                        style: AppTextStyles.bodyM
                            .copyWith(color: AppColors.sage600),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              ...reflection.answers.map((a) => _AnswerCard(answer: a)),
            ],
          ),
        ),
      ],
    );
  }

  String _moodLabel(int v) => switch (v) {
        1 => '😔 Lebih berat',
        2 => '😐 Sama saja',
        3 => '🙂 Sedikit lebih baik',
        4 => '😊 Lebih baik',
        5 => '😌 Jauh lebih tenang',
        _ => '',
      };
}

class _AnswerCard extends StatelessWidget {
  const _AnswerCard({required this.answer});
  final ReflectionAnswer answer;

  Color get _color => switch (answer.category) {
        ReflectionCategory.gratitude => AppColors.matahari500,
        ReflectionCategory.challenges => AppColors.danger500,
        ReflectionCategory.selfCompassion => const Color(0xFFE878A0),
        ReflectionCategory.insight => AppColors.biru500,
        ReflectionCategory.lettingGo => AppColors.sage500,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(answer.category.emoji, style: const TextStyle(fontSize: 14)),
              const SizedBox(width: 6),
              Text(answer.category.label,
                  style: AppTextStyles.label
                      .copyWith(color: _color, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 8),
          Text(answer.questionText,
              style: AppTextStyles.bodyM.copyWith(
                  color: AppColors.fg2,
                  fontWeight: FontWeight.w600,
                  height: 1.4)),
          const SizedBox(height: 8),
          Text(answer.answer,
              style: AppTextStyles.bodyM
                  .copyWith(color: AppColors.fg1, height: 1.6)),
        ],
      ),
    );
  }
}
