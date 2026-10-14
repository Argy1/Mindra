import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/sleep_entry_entity.dart';
import '../providers/sleep_provider.dart';

class SleepHistoryScreen extends ConsumerWidget {
  const SleepHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(sleepHistoryProvider);
    final correlationAsync = ref.watch(sleepMoodCorrelationProvider);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          color: AppColors.fg1,
          onPressed: () => context.pop(),
        ),
        title: Text('Riwayat Tidur', style: AppTextStyles.h3),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        color: AppColors.biru500,
        onRefresh: () async {
          ref.invalidate(sleepHistoryProvider);
          ref.invalidate(sleepMoodCorrelationProvider);
          await ref.read(sleepHistoryProvider.future);
        },
        child: historyAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => ListView(
            children: [
              SizedBox(height: MediaQuery.of(context).size.height * 0.3),
              Center(
                child: Column(
                  children: [
                    const Icon(Icons.error_outline_rounded,
                        size: 48, color: AppColors.neutral300),
                    const SizedBox(height: AppSpacing.md),
                    Text('Gagal memuat riwayat', style: AppTextStyles.h4),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Tarik ke bawah untuk coba lagi.',
                      style: AppTextStyles.bodyM,
                    ),
                  ],
                ),
              ),
            ],
          ),
          data: (entries) {
            if (entries.isEmpty) {
              return ListView(
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                  Center(
                    child: Column(
                      children: [
                        const Text('🌙', style: TextStyle(fontSize: 56)),
                        const SizedBox(height: AppSpacing.md),
                        Text('Belum ada catatan tidur',
                            style: AppTextStyles.h4),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Mulai catat tidurmu dan riwayat\nakan muncul di sini.',
                          style: AppTextStyles.bodyM,
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ],
              );
            }

            return ListView(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              children: [
                // ── Weekly bar chart ──────────────────────────────
                _WeeklyBarChart(entries: entries),
                const SizedBox(height: AppSpacing.xl),

                // ── Stats row ─────────────────────────────────────
                _StatsRow(entries: entries),
                const SizedBox(height: AppSpacing.xl),

                // ── Correlation insight ───────────────────────────
                correlationAsync.when(
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => Text(
                    'Insight tidur dan mood belum bisa dimuat.',
                    style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
                  ),
                  data: (c) => c.hasData
                      ? _CorrelationCard(correlation: c)
                      : const SizedBox.shrink(),
                ),
                if (correlationAsync.hasValue &&
                    (correlationAsync.value?.hasData ?? false))
                  const SizedBox(height: AppSpacing.xl),

                // ── Entry list ────────────────────────────────────
                Text('Semua Catatan', style: AppTextStyles.h4),
                const SizedBox(height: AppSpacing.sm),
                ...entries.map((e) => _SleepEntryTile(entry: e)),
                const SizedBox(height: AppSpacing.xl),
              ],
            );
          },
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly bar chart
// ─────────────────────────────────────────────────────────────────────────────

class _WeeklyBarChart extends StatelessWidget {
  const _WeeklyBarChart({required this.entries});
  final List<SleepEntry> entries;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();

    // Build 7-slot map: wakeTime date → entry
    final slotMap = <String, SleepEntry>{};
    for (final e in entries) {
      final key = '${e.wakeTime.year}-${e.wakeTime.month}-${e.wakeTime.day}';
      slotMap[key] ??= e;
    }

    final slots = List.generate(7, (i) {
      final day = DateTime(now.year, now.month, now.day)
          .subtract(Duration(days: 6 - i));
      final key = '${day.year}-${day.month}-${day.day}';
      return (day: day, entry: slotMap[key]);
    });

    final entriesWithData = slots.where((s) => s.entry != null).toList();
    final avgHours = entriesWithData.isEmpty
        ? 0.0
        : entriesWithData
                .map((s) => s.entry!.duration.inMinutes / 60)
                .reduce((a, b) => a + b) /
            entriesWithData.length;

    final barGroups = slots.asMap().entries.map((e) {
      final i = e.key;
      final slot = e.value;
      final hours =
          slot.entry != null ? slot.entry!.duration.inMinutes / 60 : 0.0;
      final color = slot.entry != null
          ? qualityBarColor(slot.entry!.quality)
          : AppColors.neutral200;

      return BarChartGroupData(
        x: i,
        barRods: [
          BarChartRodData(
            toY: hours,
            color: color,
            width: 28,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(5)),
          ),
        ],
      );
    }).toList();

    return Container(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: AppSpacing.sm),
            child: Text('7 Hari Terakhir', style: AppTextStyles.h4),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            height: 180,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceEvenly,
                maxY: 12,
                minY: 0,
                barGroups: barGroups,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: 3,
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: AppColors.neutral200,
                    strokeWidth: 1,
                    dashArray: [4, 4],
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 28,
                      interval: 3,
                      getTitlesWidget: (v, _) => Text(
                        '${v.toInt()}j',
                        style:
                            AppTextStyles.meta.copyWith(color: AppColors.fg4),
                      ),
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 22,
                      getTitlesWidget: (v, _) {
                        final idx = v.toInt();
                        if (idx < 0 || idx >= slots.length) {
                          return const SizedBox.shrink();
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            DateFormat('EEE', 'id_ID').format(slots[idx].day),
                            style: AppTextStyles.meta
                                .copyWith(color: AppColors.fg4),
                          ),
                        );
                      },
                    ),
                  ),
                  rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                ),
                extraLinesData: avgHours > 0
                    ? ExtraLinesData(
                        horizontalLines: [
                          HorizontalLine(
                            y: avgHours,
                            color: AppColors.neutral400,
                            strokeWidth: 1.5,
                            dashArray: [5, 4],
                            label: HorizontalLineLabel(
                              show: true,
                              alignment: Alignment.topRight,
                              labelResolver: (l) =>
                                  '  avg ${l.y.toStringAsFixed(1)}j',
                              style: AppTextStyles.meta
                                  .copyWith(color: AppColors.neutral500),
                            ),
                          ),
                        ],
                      )
                    : const ExtraLinesData(),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          // Legend
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _LegendDot(color: AppColors.sage500, label: 'Baik'),
              const SizedBox(width: AppSpacing.sm),
              _LegendDot(color: AppColors.matahari500, label: 'Cukup'),
              const SizedBox(width: AppSpacing.sm),
              _LegendDot(color: AppColors.danger500, label: 'Buruk'),
            ],
          ),
        ],
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: AppTextStyles.meta),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats row
// ─────────────────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.entries});
  final List<SleepEntry> entries;

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) return const SizedBox.shrink();

    final avgMinutes =
        entries.map((e) => e.duration.inMinutes).reduce((a, b) => a + b) /
            entries.length;
    final avgDuration = Duration(minutes: avgMinutes.round());
    final avgQuality =
        entries.map((e) => e.quality).reduce((a, b) => a + b) / entries.length;

    SleepEntry? bestEntry;
    for (final e in entries) {
      if (bestEntry == null ||
          e.quality > bestEntry.quality ||
          (e.quality == bestEntry.quality && e.duration > bestEntry.duration)) {
        bestEntry = e;
      }
    }

    final bestDayStr = bestEntry != null
        ? DateFormat('EEE, d MMM', 'id_ID').format(bestEntry.wakeTime)
        : '-';

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: '⏱️',
            label: 'Rata-rata',
            value: formatDuration(avgDuration),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _StatCard(
            icon: '🌟',
            label: 'Kualitas',
            value: avgQuality.toStringAsFixed(1),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _StatCard(
            icon: '🏆',
            label: 'Terbaik',
            value: bestDayStr,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  final String icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        children: [
          Text(icon, style: const TextStyle(fontSize: 20)),
          const SizedBox(height: 4),
          Text(
            value,
            style: AppTextStyles.label.copyWith(
              color: AppColors.fg1,
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTextStyles.meta,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Correlation insight card
// ─────────────────────────────────────────────────────────────────────────────

class _CorrelationCard extends StatelessWidget {
  const _CorrelationCard({required this.correlation});
  final SleepMoodCorrelation correlation;

  @override
  Widget build(BuildContext context) {
    final String text;
    if (correlation.longSleepCount >= 2) {
      text = 'Ketika kamu tidur 7+ jam, mood kamu rata-rata '
          '${correlation.avgMoodLongSleep.toStringAsFixed(1)} dari 7 '
          '(${correlation.longSleepMoodLabel}).';
    } else if (correlation.shortSleepCount >= 2) {
      text = 'Saat tidurmu kurang dari 7 jam, mood kamu cenderung '
          '${correlation.shortSleepMoodLabel.toLowerCase()}. '
          'Coba tidur lebih awal malam ini.';
    } else {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.biru50,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.biru200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('💡', style: TextStyle(fontSize: 20)),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              text,
              style: AppTextStyles.bodyM.copyWith(
                color: AppColors.biru800,
                height: 1.55,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sleep entry tile
// ─────────────────────────────────────────────────────────────────────────────

class _SleepEntryTile extends StatelessWidget {
  const _SleepEntryTile({required this.entry});
  final SleepEntry entry;

  static const _phases = ['🌑', '🌒', '🌓', '🌔', '🌕'];

  @override
  Widget build(BuildContext context) {
    final barColor = qualityBarColor(entry.quality);
    final dur = entry.duration;
    final dateLabel =
        DateFormat('EEE, d MMM yyyy', 'id_ID').format(entry.wakeTime);
    final bedStr =
        '${entry.bedtime.hour.toString().padLeft(2, '0')}:${entry.bedtime.minute.toString().padLeft(2, '0')}';
    final wakeStr =
        '${entry.wakeTime.hour.toString().padLeft(2, '0')}:${entry.wakeTime.minute.toString().padLeft(2, '0')}';

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Quality indicator
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: barColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                _phases[(entry.quality - 1).clamp(0, 4)],
                style: const TextStyle(fontSize: 20),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      formatDuration(dur),
                      style: AppTextStyles.bodyM.copyWith(
                        color: AppColors.fg1,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    Text(dateLabel, style: AppTextStyles.meta),
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    const Icon(Icons.bedtime_rounded,
                        size: 12, color: AppColors.neutral400),
                    const SizedBox(width: 3),
                    Text(bedStr,
                        style:
                            AppTextStyles.meta.copyWith(color: AppColors.fg3)),
                    const SizedBox(width: AppSpacing.xs),
                    const Icon(Icons.wb_sunny_rounded,
                        size: 12, color: AppColors.neutral400),
                    const SizedBox(width: 3),
                    Text(wakeStr,
                        style:
                            AppTextStyles.meta.copyWith(color: AppColors.fg3)),
                  ],
                ),
                if (entry.notes.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    entry.notes,
                    style: AppTextStyles.bodyS,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),

          // Duration color strip
          Container(
            width: 4,
            height: 48,
            margin: const EdgeInsets.only(left: AppSpacing.sm),
            decoration: BoxDecoration(
              color: durationColor(dur),
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
          ),
        ],
      ),
    );
  }
}
