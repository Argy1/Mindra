import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../domain/entities/weekly_insight_entity.dart';
import '../providers/weekly_insight_provider.dart';

class WeeklyInsightScreen extends ConsumerWidget {
  const WeeklyInsightScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(weeklyInsightProvider);
    final notifier = ref.read(weeklyInsightProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceCanvas,
        elevation: 0,
        scrolledUnderElevation: 1,
        shadowColor: AppColors.neutral900.withValues(alpha: 0.08),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text('Laporan Minggu Ini', style: AppTextStyles.h3),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            onPressed: () => notifier.refresh(),
          ),
        ],
      ),
      body: _WeeklyInsightBody(state: state, notifier: notifier),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Body
// ─────────────────────────────────────────────────────────────────────────────

class _WeeklyInsightBody extends StatelessWidget {
  const _WeeklyInsightBody({required this.state, required this.notifier});

  final WeeklyInsightState state;
  final WeeklyInsightNotifier notifier;

  @override
  Widget build(BuildContext context) {
    if (state.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.biru500),
      );
    }

    if (state.error != null && state.insight == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded,
                  size: 48, color: AppColors.neutral300),
              const SizedBox(height: AppSpacing.md),
              Text('Gagal memuat laporan.',
                  style: AppTextStyles.bodyM, textAlign: TextAlign.center),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: notifier.refresh,
                child: const Text('Coba lagi'),
              ),
            ],
          ),
        ),
      );
    }

    final data = state.insight;
    if (data == null) return const SizedBox.shrink();

    return RefreshIndicator(
      color: AppColors.biru500,
      onRefresh: () async => notifier.refresh(),
      child: ListView(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenPadding, vertical: AppSpacing.md),
        children: [
          // Week navigation row
          _WeekNavRow(state: state, notifier: notifier),
          const SizedBox(height: AppSpacing.xl),

          // Narrative card
          _NarrativeCard(data: data),
          const SizedBox(height: AppSpacing.xl),

          // Stats row
          _StatsRow(data: data),
          const SizedBox(height: AppSpacing.xl),

          // Mood chart
          Text('Perasaan Harian', style: AppTextStyles.h4),
          const SizedBox(height: AppSpacing.md),
          _MoodChart(points: data.moodPoints),
          const SizedBox(height: AppSpacing.sm),
          _MoodLegend(),
          const SizedBox(height: AppSpacing.xl),

          // Achievements
          if (data.badges.isNotEmpty) ...[
            Text('Pencapaian Minggu Ini', style: AppTextStyles.h4),
            const SizedBox(height: AppSpacing.md),
            _BadgesRow(badges: data.badges),
            const SizedBox(height: AppSpacing.xl),
          ],

          // Pattern insights
          if (data.patternInsights.isNotEmpty) ...[
            Text('Pola yang Terdeteksi', style: AppTextStyles.h4),
            const SizedBox(height: AppSpacing.md),
            ...data.patternInsights.map((p) => _PatternTile(text: p)),
            const SizedBox(height: AppSpacing.xl),
          ],

          // Recommendation
          if (data.recommendation != null) ...[
            _RecommendationCard(text: data.recommendation!),
            const SizedBox(height: AppSpacing.xl),
          ],

          // No data empty state
          if (data.moodPoints.every((p) => p.score == null))
            _EmptyState(),

          SizedBox(height: MediaQuery.of(context).padding.bottom + 24),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Week navigation
// ─────────────────────────────────────────────────────────────────────────────

class _WeekNavRow extends StatelessWidget {
  const _WeekNavRow({required this.state, required this.notifier});

  final WeeklyInsightState state;
  final WeeklyInsightNotifier notifier;

  @override
  Widget build(BuildContext context) {
    final start = state.weekStart;
    final end = start.add(const Duration(days: 6));
    final label = _periodLabel(start, end);

    return Row(
      children: [
        IconButton(
          icon: const Icon(Icons.chevron_left_rounded),
          onPressed: notifier.prevWeek,
          color: AppColors.fg2,
        ),
        Expanded(
          child: Text(
            label,
            style: AppTextStyles.bodyM.copyWith(
                color: AppColors.fg2, fontWeight: FontWeight.w600),
            textAlign: TextAlign.center,
          ),
        ),
        IconButton(
          icon: Icon(
            Icons.chevron_right_rounded,
            color: state.canGoNext ? AppColors.fg2 : AppColors.fg4,
          ),
          onPressed: state.canGoNext ? notifier.nextWeek : null,
        ),
      ],
    );
  }

  String _periodLabel(DateTime start, DateTime end) {
    final fmtDay = DateFormat('d', 'id_ID');
    final fmtDayMon = DateFormat('d MMM', 'id_ID');
    final fmtFull = DateFormat('d MMM yyyy', 'id_ID');
    if (start.month == end.month) {
      return '${fmtDay.format(start)}–${fmtFull.format(end)}';
    }
    return '${fmtDayMon.format(start)} – ${fmtFull.format(end)}';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Narrative card
// ─────────────────────────────────────────────────────────────────────────────

class _NarrativeCard extends StatelessWidget {
  const _NarrativeCard({required this.data});

  final WeeklyInsightData data;

  @override
  Widget build(BuildContext context) {
    final mood = data.avgMood;
    final colors = mood == null
        ? [const Color(0xFF5A7FA6), const Color(0xFF3A6080)]
        : mood >= 4.0
            ? [const Color(0xFF3A8C76), const Color(0xFF2D6B5A)]
            : mood >= 3.0
                ? [const Color(0xFF2E6DA4), const Color(0xFF1B4267)]
                : [const Color(0xFF8B6080), const Color(0xFF6A4060)];

    final emoji = mood == null
        ? '📊'
        : mood >= 4.0
            ? '🌟'
            : mood >= 3.0
                ? '🌤️'
                : '🌧️';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: colors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.cardHero),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 32)),
          const SizedBox(height: AppSpacing.md),
          Text(
            data.narrative.isNotEmpty
                ? data.narrative
                : 'Mulai check-in harian untuk melihat ringkasan mingguanmu.',
            style: AppTextStyles.bodyM
                .copyWith(color: Colors.white, height: 1.6),
          ),
          if (mood != null) ...[
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                  child: Text(
                    'Rata-rata mood: ${mood.toStringAsFixed(1)}/5',
                    style: AppTextStyles.label
                        .copyWith(color: Colors.white),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats row — 4 cards
// ─────────────────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.data});

  final WeeklyInsightData data;

  @override
  Widget build(BuildContext context) {
    final mood = data.avgMood;
    final sleep = data.avgSleepHours;

    final trendIcon = _trendIcon(data.moodTrend);
    final sleepTrendIcon = _trendIcon2(data.sleepTrend);

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            emoji: '😊',
            value: mood != null ? mood.toStringAsFixed(1) : '—',
            unit: '/5',
            label: 'Rata-rata\nMood',
            accent: AppColors.biru100,
            trendWidget: trendIcon,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _StatCard(
            emoji: '😴',
            value: sleep != null ? sleep.toStringAsFixed(1) : '—',
            unit: 'jam',
            label: 'Rata-rata\nTidur',
            accent: AppColors.sage100,
            trendWidget: sleepTrendIcon,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _StatCard(
            emoji: '📋',
            value: '${data.assessmentsDone}',
            unit: 'x',
            label: 'Asesmen\nSelesai',
            accent: AppColors.matahari100,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _StatCard(
            emoji: '🧘',
            value: '${data.reflectionsDone}',
            unit: 'x',
            label: 'Refleksi\nMalam',
            accent: AppColors.neutral100,
          ),
        ),
      ],
    );
  }

  Widget? _trendIcon(MoodTrend t) {
    if (t == MoodTrend.rising) {
      return const Icon(Icons.trending_up_rounded,
          size: 14, color: AppColors.sage500);
    }
    if (t == MoodTrend.falling) {
      return const Icon(Icons.trending_down_rounded,
          size: 14, color: AppColors.danger300);
    }
    return null;
  }

  Widget? _trendIcon2(SleepTrend t) {
    if (t == SleepTrend.rising) {
      return const Icon(Icons.trending_up_rounded,
          size: 14, color: AppColors.sage500);
    }
    if (t == SleepTrend.falling) {
      return const Icon(Icons.trending_down_rounded,
          size: 14, color: AppColors.danger300);
    }
    return null;
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.emoji,
    required this.value,
    required this.unit,
    required this.label,
    required this.accent,
    this.trendWidget,
  });

  final String emoji, value, unit, label;
  final Color accent;
  final Widget? trendWidget;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: accent,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 18)),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                value,
                style: AppTextStyles.h4.copyWith(color: AppColors.fg1),
              ),
              if (value != '—') ...[
                const SizedBox(width: 2),
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text(unit,
                      style:
                          AppTextStyles.meta.copyWith(color: AppColors.fg3)),
                ),
              ],
              if (trendWidget != null) ...[
                const SizedBox(width: 4),
                trendWidget!,
              ],
            ],
          ),
          const SizedBox(height: 2),
          Text(label,
              style: AppTextStyles.meta
                  .copyWith(color: AppColors.fg3, height: 1.3),
              maxLines: 2),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mood chart
// ─────────────────────────────────────────────────────────────────────────────

class _MoodChart extends StatelessWidget {
  const _MoodChart({required this.points});

  final List<DayMoodPoint> points;

  static const _barMaxHeight = 80.0;

  Color _barColor(int score) => switch (score) {
        5 => AppColors.sage500,
        4 => AppColors.biru400,
        3 => AppColors.matahari400,
        2 => AppColors.hangat500,
        _ => AppColors.danger300,
      };

  String _scoreEmoji(int score) => switch (score) {
        5 => '😊',
        4 => '😌',
        3 => '😐',
        2 => '😰',
        _ => '😢',
      };

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    return Container(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.md, AppSpacing.md, AppSpacing.md, AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Column(
        children: [
          SizedBox(
            height: _barMaxHeight + 40,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: points.map((p) {
                final isToday = p.date.year == today.year &&
                    p.date.month == today.month &&
                    p.date.day == today.day;
                final hasData = p.score != null;
                final frac = hasData ? p.score! / 5.0 : 0.0;
                final barH = hasData
                    ? (_barMaxHeight * frac).clamp(8.0, _barMaxHeight)
                    : 4.0;
                final color =
                    hasData ? _barColor(p.score!) : AppColors.neutral200;

                return Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (hasData)
                        Text(
                          _scoreEmoji(p.score!),
                          style: const TextStyle(fontSize: 12),
                        )
                      else
                        const SizedBox(height: 16),
                      const SizedBox(height: 4),
                      SizedBox(
                        height: _barMaxHeight,
                        child: Align(
                          alignment: Alignment.bottomCenter,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 500),
                            curve: Curves.easeOut,
                            height: barH,
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            decoration: BoxDecoration(
                              color: color,
                              borderRadius: BorderRadius.circular(6),
                              border: isToday
                                  ? Border.all(
                                      color: AppColors.biru500, width: 2)
                                  : null,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        p.dayLabel,
                        style: AppTextStyles.meta.copyWith(
                          color: isToday ? AppColors.biru600 : AppColors.fg4,
                          fontWeight:
                              isToday ? FontWeight.w700 : FontWeight.w400,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _MoodLegend extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final items = [
      ('😊', 'Sangat baik'),
      ('😌', 'Baik'),
      ('😐', 'Sedang'),
      ('😰', 'Khawatir'),
      ('😢', 'Berat'),
    ];
    return Wrap(
      spacing: AppSpacing.md,
      runSpacing: 4,
      children: items
          .map((e) => Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(e.$1, style: const TextStyle(fontSize: 12)),
                  const SizedBox(width: 3),
                  Text(e.$2,
                      style: AppTextStyles.meta
                          .copyWith(color: AppColors.fg4, fontSize: 11)),
                ],
              ))
          .toList(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Badges
// ─────────────────────────────────────────────────────────────────────────────

class _BadgesRow extends StatelessWidget {
  const _BadgesRow({required this.badges});

  final List<WeeklyBadge> badges;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 90,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: badges.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (_, i) => _BadgeChip(badge: badges[i]),
      ),
    );
  }
}

class _BadgeChip extends StatelessWidget {
  const _BadgeChip({required this.badge});

  final WeeklyBadge badge;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 88,
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.matahari50,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.matahari200),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(badge.emoji, style: const TextStyle(fontSize: 28)),
          const SizedBox(height: 4),
          Text(
            badge.label,
            style: AppTextStyles.meta.copyWith(
                color: AppColors.matahari700,
                fontSize: 10,
                fontWeight: FontWeight.w600),
            textAlign: TextAlign.center,
            maxLines: 2,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern insight tile
// ─────────────────────────────────────────────────────────────────────────────

class _PatternTile extends StatelessWidget {
  const _PatternTile({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.biru50,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.lightbulb_outline_rounded,
                size: 18, color: AppColors.biru500),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                text,
                style: AppTextStyles.bodyM
                    .copyWith(color: AppColors.fg1, height: 1.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation card
// ─────────────────────────────────────────────────────────────────────────────

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF4A9E8F), Color(0xFF3A7E72)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome_rounded,
                  size: 18, color: Colors.white),
              const SizedBox(width: 8),
              Text(
                'Rekomendasi untuk Kamu',
                style: AppTextStyles.label.copyWith(
                    color: Colors.white.withValues(alpha: 0.9)),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            text,
            style: AppTextStyles.bodyM
                .copyWith(color: Colors.white, height: 1.5),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xxl),
      child: Column(
        children: [
          const Text('📭', style: TextStyle(fontSize: 48)),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Belum ada data minggu ini',
            style: AppTextStyles.h4.copyWith(color: AppColors.fg2),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Check-in mood, catat tidur, atau isi refleksi malam\nuntuk melihat laporanmu.',
            style: AppTextStyles.bodyS.copyWith(
                color: AppColors.fg4, height: 1.5),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
