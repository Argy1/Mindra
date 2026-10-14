import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/mood_entry_entity.dart';
import '../providers/mood_provider.dart';

class MoodHistoryScreen extends ConsumerStatefulWidget {
  const MoodHistoryScreen({super.key});

  @override
  ConsumerState<MoodHistoryScreen> createState() => _MoodHistoryScreenState();
}

class _MoodHistoryScreenState extends ConsumerState<MoodHistoryScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
        title: Text('Riwayat Mood', style: AppTextStyles.h3),
        centerTitle: true,
        bottom: TabBar(
          controller: _tab,
          labelStyle: AppTextStyles.label.copyWith(fontWeight: FontWeight.w700),
          unselectedLabelStyle: AppTextStyles.label,
          labelColor: AppColors.biru600,
          unselectedLabelColor: AppColors.fg3,
          indicatorColor: AppColors.biru500,
          indicatorSize: TabBarIndicatorSize.tab,
          dividerColor: AppColors.borderSoft,
          tabs: const [
            Tab(text: 'Minggu Ini'),
            Tab(text: 'Bulan Ini'),
            Tab(text: '3 Bulan'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: const [
          _HistoryTabView(period: MoodPeriod.week),
          _HistoryTabView(period: MoodPeriod.month),
          _HistoryTabView(period: MoodPeriod.threeMonths),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab content — loads history + insights for the given period
// ─────────────────────────────────────────────────────────────────────────────

class _HistoryTabView extends ConsumerWidget {
  const _HistoryTabView({required this.period});

  final MoodPeriod period;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(moodHistoryProvider(period));
    final insightsAsync = ref.watch(moodInsightsProvider(period));

    return RefreshIndicator(
      color: AppColors.biru500,
      onRefresh: () async {
        ref.invalidate(moodHistoryProvider(period));
        ref.invalidate(moodInsightsProvider(period));
        await ref.read(moodHistoryProvider(period).future);
      },
      child: historyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline_rounded,
                    size: 48, color: AppColors.neutral300),
                const SizedBox(height: AppSpacing.md),
                Text('Gagal memuat riwayat', style: AppTextStyles.h4),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Periksa koneksimu dan tarik ke bawah untuk coba lagi.',
                  style: AppTextStyles.bodyM,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
        data: (entries) {
          if (entries.isEmpty) {
            return ListView(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              children: [
                const SizedBox(height: AppSpacing.xxl),
                Center(
                  child: Column(
                    children: [
                      const Icon(Icons.mood_rounded,
                          size: 64, color: AppColors.neutral300),
                      const SizedBox(height: AppSpacing.md),
                      Text('Belum ada catatan mood', style: AppTextStyles.h4),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Mulai catat perasaanmu setiap hari\nagar grafikmu muncul di sini.',
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
              // ── Chart ──────────────────────────────────────────────
              _MoodChart(entries: entries, period: period),
              const SizedBox(height: AppSpacing.xl),

              // ── Insight card ────────────────────────────────────────
              insightsAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => Text(
                  'Insight mood belum bisa dimuat.',
                  style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
                ),
                data: (insights) => insights.hasData
                    ? _InsightCard(insights: insights)
                    : const SizedBox.shrink(),
              ),
              const SizedBox(height: AppSpacing.xl),

              // ── Entry list ──────────────────────────────────────────
              Text('Catatan Harianmu', style: AppTextStyles.h4),
              const SizedBox(height: AppSpacing.sm),
              ...entries.map((e) => _MoodEntryTile(entry: e)),
            ],
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Line chart
// ─────────────────────────────────────────────────────────────────────────────

class _MoodChart extends StatelessWidget {
  const _MoodChart({required this.entries, required this.period});

  final List<MoodEntry> entries;
  final MoodPeriod period;

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) return const SizedBox.shrink();

    final days = switch (period) {
      MoodPeriod.week => 7,
      MoodPeriod.month => 30,
      MoodPeriod.threeMonths => 90,
    };

    final now = DateTime.now();
    final periodStart = DateTime(now.year, now.month, now.day)
        .subtract(Duration(days: days - 1));

    // Map entries to (dayIndex, score)
    final spots = <FlSpot>[];
    for (final entry in entries) {
      final dayIdx = entry.createdAt.difference(periodStart).inDays.toDouble();
      if (dayIdx >= 0 && dayIdx < days) {
        spots.add(FlSpot(dayIdx, moodTypeToScore(entry.moodType).toDouble()));
      }
    }
    spots.sort((a, b) => a.x.compareTo(b.x));

    if (spots.isEmpty) return const SizedBox.shrink();

    final xInterval = days <= 7 ? 1.0 : (days <= 30 ? 7.0 : 30.0);

    return Container(
      height: 200,
      padding: const EdgeInsets.only(
        top: AppSpacing.md,
        right: AppSpacing.md,
        bottom: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: LineChart(
        LineChartData(
          minY: 1,
          maxY: 7,
          minX: 0,
          maxX: (days - 1).toDouble(),
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: 1,
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
                reservedSize: 24,
                interval: 1,
                getTitlesWidget: (value, _) {
                  final emoji = switch (value.toInt()) {
                    7 => '😄',
                    5 => '😌',
                    3 => '😴',
                    1 => '😢',
                    _ => '',
                  };
                  if (emoji.isEmpty) return const SizedBox.shrink();
                  return Text(emoji, style: const TextStyle(fontSize: 12));
                },
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 22,
                interval: xInterval,
                getTitlesWidget: (value, _) {
                  final day = periodStart.add(Duration(days: value.toInt()));
                  final label = days <= 7
                      ? DateFormat('EEE', 'id_ID').format(day)
                      : days <= 30
                          ? DateFormat('d/M').format(day)
                          : DateFormat('MMM', 'id_ID').format(day);
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      label,
                      style: AppTextStyles.meta.copyWith(color: AppColors.fg4),
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
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              curveSmoothness: 0.4,
              color: AppColors.biru500,
              barWidth: 2.5,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: true,
                getDotPainter: (spot, _, __, ___) => FlDotCirclePainter(
                  radius: 4,
                  color: AppColors.biru500,
                  strokeWidth: 2,
                  strokeColor: Colors.white,
                ),
              ),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppColors.biru300.withValues(alpha: 0.35),
                    AppColors.biru200.withValues(alpha: 0.05),
                  ],
                ),
              ),
            ),
          ],
          lineTouchData: const LineTouchData(enabled: true),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Insight card
// ─────────────────────────────────────────────────────────────────────────────

class _InsightCard extends StatelessWidget {
  const _InsightCard({required this.insights});

  final MoodInsights insights;

  @override
  Widget build(BuildContext context) {
    final trendIcon = switch (insights.trendDirection) {
      1 => Icons.trending_up_rounded,
      -1 => Icons.trending_down_rounded,
      _ => Icons.trending_flat_rounded,
    };
    final trendColor = switch (insights.trendDirection) {
      1 => AppColors.sage500,
      -1 => AppColors.danger500,
      _ => AppColors.neutral400,
    };
    final trendLabel = switch (insights.trendDirection) {
      1 => 'Membaik',
      -1 => 'Menurun',
      _ => 'Stabil',
    };

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.biru600, AppColors.biru800],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Ringkasan',
            style: AppTextStyles.overline.copyWith(
              color: AppColors.biru200,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              _InsightStat(
                emoji: moodTypeToEmoji(insights.mostCommonMood ?? 'tenang'),
                label: 'Mood Utama',
                value: _capitalize(insights.mostCommonMood ?? '-'),
              ),
              const SizedBox(width: AppSpacing.xl),
              _InsightStat(
                emoji: '📊',
                label: 'Rata-rata',
                value: insights.averageScore.toStringAsFixed(1),
              ),
              const SizedBox(width: AppSpacing.xl),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tren',
                    style:
                        AppTextStyles.meta.copyWith(color: AppColors.biru200),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Icon(trendIcon, color: trendColor, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        trendLabel,
                        style: AppTextStyles.label.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          if (insights.bestDayLabel != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xs,
              ),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Text(
                '✨ Hari terbaikmu: ${insights.bestDayLabel}',
                style: AppTextStyles.bodyS.copyWith(
                  color: Colors.white,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

class _InsightStat extends StatelessWidget {
  const _InsightStat({
    required this.emoji,
    required this.label,
    required this.value,
  });

  final String emoji;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.meta.copyWith(color: AppColors.biru200),
        ),
        const SizedBox(height: 2),
        Row(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 4),
            Text(
              value,
              style: AppTextStyles.label.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mood entry tile
// ─────────────────────────────────────────────────────────────────────────────

class _MoodEntryTile extends StatelessWidget {
  const _MoodEntryTile({required this.entry});

  final MoodEntry entry;

  @override
  Widget build(BuildContext context) {
    final score = moodTypeToScore(entry.moodType);
    final color = _scoreColor(score);
    final dateLabel =
        DateFormat('EEE, d MMM · HH:mm', 'id_ID').format(entry.createdAt);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Score circle
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                moodTypeToEmoji(entry.moodType),
                style: const TextStyle(fontSize: 18),
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
                      _capitalize(entry.moodType),
                      style: AppTextStyles.bodyM.copyWith(
                        color: AppColors.fg1,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    Text(dateLabel, style: AppTextStyles.meta),
                  ],
                ),
                if (entry.triggers.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    children: entry.triggers
                        .map(
                          (t) => Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.neutral100,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.tag),
                            ),
                            child: Text(t, style: AppTextStyles.meta),
                          ),
                        )
                        .toList(),
                  ),
                ],
                if (entry.note.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    entry.note,
                    style: AppTextStyles.bodyS,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (entry.energyLevel != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.bolt_rounded,
                          size: 12, color: AppColors.neutral400),
                      const SizedBox(width: 2),
                      Text(
                        'Energi: ${entry.energyLevel}/5',
                        style: AppTextStyles.meta,
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  static Color _scoreColor(int score) {
    if (score >= 6) return AppColors.success500;
    if (score >= 4) return AppColors.biru400;
    if (score >= 3) return AppColors.matahari500;
    return AppColors.danger500;
  }

  static String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}
