import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/exercise_entity.dart';
import '../providers/exercise_provider.dart';

class BehavioralActivationScreen extends ConsumerStatefulWidget {
  const BehavioralActivationScreen({super.key});

  @override
  ConsumerState<BehavioralActivationScreen> createState() =>
      _BehavioralActivationScreenState();
}

class _BehavioralActivationScreenState
    extends ConsumerState<BehavioralActivationScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  final _customCtrl = TextEditingController();
  ActivityCategory _addCategory = ActivityCategory.fisik;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _customCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final state = ref.watch(behavioralActivationProvider);
    final notifier = ref.read(behavioralActivationProvider.notifier);

    if (!_loaded && user != null) {
      _loaded = true;
      WidgetsBinding.instance
          .addPostFrameCallback((_) => notifier.load(user.id));
    }

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text('Behavioral Activation', style: AppTextStyles.h3),
        bottom: TabBar(
          controller: _tabCtrl,
          labelColor: AppColors.biru500,
          unselectedLabelColor: AppColors.fg4,
          indicatorColor: AppColors.biru500,
          tabs: const [
            Tab(text: 'Hari Ini'),
            Tab(text: 'Minggu Ini'),
          ],
        ),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabCtrl,
              children: [
                _TodayTab(
                  state: state,
                  notifier: notifier,
                  customCtrl: _customCtrl,
                  addCategory: _addCategory,
                  onCategoryChanged: (c) => setState(() => _addCategory = c),
                  onMarkComplete: () {
                    if (user != null) notifier.markComplete(user.id);
                  },
                ),
                _WeekTab(stats: state.weeklyStats),
              ],
            ),
    );
  }
}

// ─── Today Tab ───────────────────────────────────────────────────────────────

class _TodayTab extends StatelessWidget {
  const _TodayTab({
    required this.state,
    required this.notifier,
    required this.customCtrl,
    required this.addCategory,
    required this.onCategoryChanged,
    required this.onMarkComplete,
  });

  final BehavioralActivationState state;
  final BehavioralActivationNotifier notifier;
  final TextEditingController customCtrl;
  final ActivityCategory addCategory;
  final void Function(ActivityCategory) onCategoryChanged;
  final VoidCallback onMarkComplete;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (state.error != null) _ActivityErrorBanner(message: state.error!),
        // Progress header
        _ProgressHeader(state: state),

        // Category filter
        SizedBox(
          height: 44,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            scrollDirection: Axis.horizontal,
            children: [
              _FilterChip(
                label: 'Semua',
                selected: state.activeCategory == null,
                onTap: () => notifier.setFilter(null),
              ),
              ...ActivityCategory.values.map((c) => Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _FilterChip(
                      label: '${c.emoji} ${c.label}',
                      selected: state.activeCategory == c,
                      onTap: () => notifier
                          .setFilter(state.activeCategory == c ? null : c),
                    ),
                  )),
            ],
          ),
        ),

        // Activity list
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
            children: [
              ...state.filtered.map((a) => _ActivityTile(
                    item: a,
                    onToggle: () => notifier.toggleActivity(a.id),
                  )),
              const SizedBox(height: 16),
              _AddActivityCard(
                ctrl: customCtrl,
                selectedCategory: addCategory,
                onCategoryChanged: onCategoryChanged,
                onAdd: () {
                  if (customCtrl.text.trim().isNotEmpty) {
                    notifier.addCustomActivity(
                        customCtrl.text.trim(), addCategory);
                    customCtrl.clear();
                  }
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActivityErrorBanner extends StatelessWidget {
  const _ActivityErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.danger50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.danger300),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: AppColors.danger500,
            size: 18,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: AppTextStyles.bodyM.copyWith(color: AppColors.danger700),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressHeader extends StatelessWidget {
  const _ProgressHeader({required this.state});
  final BehavioralActivationState state;

  @override
  Widget build(BuildContext context) {
    final pct = (state.completionRate * 100).round();
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '${state.completedCount} dari ${state.activities.length} aktivitas selesai',
                style: AppTextStyles.bodyM.copyWith(color: AppColors.fg2),
              ),
              const Spacer(),
              Text('$pct%',
                  style: AppTextStyles.h3.copyWith(
                      color: AppColors.matahari500,
                      fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: state.completionRate,
              minHeight: 8,
              backgroundColor: AppColors.borderSoft,
              valueColor:
                  const AlwaysStoppedAnimation<Color>(AppColors.matahari500),
            ),
          ),
          if (pct == 100) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.star_rounded,
                    color: AppColors.matahari500, size: 18),
                const SizedBox(width: 6),
                Text(
                  'Luar biasa! Semua aktivitas hari ini selesai.',
                  style: AppTextStyles.label
                      .copyWith(color: AppColors.matahari600),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.item, required this.onToggle});
  final ActivityItem item;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: item.isCompleted ? AppColors.success50 : AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: item.isCompleted
              ? AppColors.success500.withValues(alpha: 0.4)
              : AppColors.borderSoft,
        ),
      ),
      child: ListTile(
        onTap: onToggle,
        leading: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: item.isCompleted ? AppColors.success500 : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: item.isCompleted
                  ? AppColors.success500
                  : AppColors.borderMedium,
              width: 2,
            ),
          ),
          child: item.isCompleted
              ? const Icon(Icons.check, size: 16, color: Colors.white)
              : null,
        ),
        title: Text(
          item.label,
          style: AppTextStyles.bodyM.copyWith(
            color: item.isCompleted ? AppColors.fg3 : AppColors.fg1,
            decoration: item.isCompleted ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: Text(
          '${item.category.emoji} ${item.category.label}'
          '${item.isCustom ? ' · Kustom' : ''}',
          style:
              AppTextStyles.label.copyWith(color: AppColors.fg4, fontSize: 11),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip(
      {required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.matahari500 : AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.matahari500 : AppColors.borderMedium,
          ),
        ),
        child: Text(
          label,
          style: AppTextStyles.label.copyWith(
            color: selected ? Colors.white : AppColors.fg3,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

class _AddActivityCard extends StatelessWidget {
  const _AddActivityCard({
    required this.ctrl,
    required this.selectedCategory,
    required this.onCategoryChanged,
    required this.onAdd,
  });
  final TextEditingController ctrl;
  final ActivityCategory selectedCategory;
  final void Function(ActivityCategory) onCategoryChanged;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceTint,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.biru200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Tambah Aktivitas Kustom',
              style: AppTextStyles.h4.copyWith(color: AppColors.biru700)),
          const SizedBox(height: 10),
          TextField(
            controller: ctrl,
            style: AppTextStyles.bodyM.copyWith(color: AppColors.fg1),
            decoration: InputDecoration(
              hintText: 'Nama aktivitas...',
              hintStyle: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
              filled: true,
              fillColor: AppColors.surfaceCard,
              contentPadding: const EdgeInsets.all(12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.borderSoft),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.borderSoft),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide:
                    const BorderSide(color: AppColors.biru500, width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: ActivityCategory.values.map((c) {
                final sel = c == selectedCategory;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: GestureDetector(
                    onTap: () => onCategoryChanged(c),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: sel ? AppColors.biru500 : AppColors.surfaceCard,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: sel ? AppColors.biru500 : AppColors.borderSoft,
                        ),
                      ),
                      child: Text(
                        '${c.emoji} ${c.label}',
                        style: AppTextStyles.label.copyWith(
                          color: sel ? Colors.white : AppColors.fg3,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Tambah'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.biru500,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Week Tab ────────────────────────────────────────────────────────────────

class _WeekTab extends StatelessWidget {
  const _WeekTab({required this.stats});
  final List<Map<String, dynamic>> stats;

  @override
  Widget build(BuildContext context) {
    if (stats.isEmpty) {
      return const Center(
        child: Text('Belum ada data minggu ini'),
      );
    }

    final maxCompleted = stats
        .map((s) => (s['completed'] as int))
        .fold(0, (a, b) => a > b ? a : b);

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Penyelesaian 7 Hari Terakhir',
              style: AppTextStyles.h3.copyWith(color: AppColors.fg1)),
          const SizedBox(height: 4),
          Text(
            'Jumlah aktivitas yang diselesaikan per hari',
            style: AppTextStyles.bodyM.copyWith(color: AppColors.fg4),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 180,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: stats.map((s) {
                final date = s['date'] as DateTime;
                final completed = s['completed'] as int;
                final total = s['total'] as int;
                final ratio = total == 0 ? 0.0 : completed / total;
                final isToday = _isToday(date);
                return _WeekBar(
                  dayLabel: _dayLabel(date),
                  ratio: ratio,
                  completed: completed,
                  total: total,
                  isToday: isToday,
                  maxCompleted: maxCompleted,
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 24),
          _WeekSummary(stats: stats),
        ],
      ),
    );
  }

  bool _isToday(DateTime d) {
    final now = DateTime.now();
    return d.year == now.year && d.month == now.month && d.day == now.day;
  }

  String _dayLabel(DateTime d) {
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    return days[d.weekday - 1];
  }
}

class _WeekBar extends StatelessWidget {
  const _WeekBar({
    required this.dayLabel,
    required this.ratio,
    required this.completed,
    required this.total,
    required this.isToday,
    required this.maxCompleted,
  });
  final String dayLabel;
  final double ratio;
  final int completed, total, maxCompleted;
  final bool isToday;

  @override
  Widget build(BuildContext context) {
    const maxHeight = 120.0;
    final barH = ratio == 0 ? 4.0 : (ratio * maxHeight).clamp(4.0, maxHeight);

    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Text(
          '$completed',
          style: AppTextStyles.label.copyWith(
            color: isToday ? AppColors.matahari600 : AppColors.fg4,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        AnimatedContainer(
          duration: const Duration(milliseconds: 500),
          width: 32,
          height: barH,
          decoration: BoxDecoration(
            color: isToday
                ? AppColors.matahari500
                : ratio > 0.5
                    ? AppColors.biru500
                    : AppColors.borderMedium,
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          dayLabel,
          style: AppTextStyles.label.copyWith(
            color: isToday ? AppColors.matahari600 : AppColors.fg4,
            fontSize: 11,
            fontWeight: isToday ? FontWeight.w700 : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}

class _WeekSummary extends StatelessWidget {
  const _WeekSummary({required this.stats});
  final List<Map<String, dynamic>> stats;

  @override
  Widget build(BuildContext context) {
    final totalCompleted =
        stats.fold<int>(0, (sum, s) => sum + (s['completed'] as int));
    final activeDays = stats.where((s) => (s['completed'] as int) > 0).length;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        children: [
          _StatCell(
              label: 'Total Aktivitas',
              value: '$totalCompleted',
              color: AppColors.biru500),
          _divider(),
          _StatCell(
              label: 'Hari Aktif',
              value: '$activeDays / 7',
              color: AppColors.matahari500),
          _divider(),
          _StatCell(
              label: 'Rata-rata / Hari',
              value: activeDays == 0
                  ? '0'
                  : (totalCompleted / activeDays).toStringAsFixed(1),
              color: AppColors.sage500),
        ],
      ),
    );
  }

  Widget _divider() => Container(
      width: 1,
      height: 40,
      color: AppColors.borderSoft,
      margin: const EdgeInsets.symmetric(horizontal: 8));
}

class _StatCell extends StatelessWidget {
  const _StatCell(
      {required this.label, required this.value, required this.color});
  final String label, value;
  final Color color;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(
          children: [
            Text(value,
                style: AppTextStyles.h3
                    .copyWith(color: color, fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            Text(label,
                style: AppTextStyles.label
                    .copyWith(color: AppColors.fg4, fontSize: 11),
                textAlign: TextAlign.center),
          ],
        ),
      );
}
