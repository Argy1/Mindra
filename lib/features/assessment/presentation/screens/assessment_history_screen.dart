import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/assessment_repository.dart';
import '../providers/assessment_provider.dart';

// ── Tab definitions ──────────────────────────────────────────────────────────

const _tabs = [
  _TabDef(label: 'PHQ-9',  id: 'phq9'),
  _TabDef(label: 'GAD-7',  id: 'gad7'),
  _TabDef(label: 'SRQ-20', id: 'srq20'),
  _TabDef(label: 'PSS-10', id: 'pss10'),
];

class _TabDef {
  const _TabDef({required this.label, required this.id});
  final String label;
  final String id;
}

// ── Severity zone data ───────────────────────────────────────────────────────

class _Zone {
  const _Zone({required this.from, required this.to, required this.color});
  final double from;
  final double to;
  final Color color;
}

List<_Zone> _zonesFor(String id) {
  switch (id) {
    case 'phq9':
      return const [
        _Zone(from: 0,  to: 4,  color: Color(0x204A9E8F)),
        _Zone(from: 4,  to: 9,  color: Color(0x202E6DA4)),
        _Zone(from: 9,  to: 14, color: Color(0x20E07B00)),
        _Zone(from: 14, to: 27, color: Color(0x20C0392B)),
      ];
    case 'gad7':
      return const [
        _Zone(from: 0,  to: 4,  color: Color(0x204A9E8F)),
        _Zone(from: 4,  to: 9,  color: Color(0x202E6DA4)),
        _Zone(from: 9,  to: 14, color: Color(0x20E07B00)),
        _Zone(from: 14, to: 21, color: Color(0x20C0392B)),
      ];
    case 'pss10':
      return const [
        _Zone(from: 0,  to: 13, color: Color(0x204A9E8F)),
        _Zone(from: 13, to: 26, color: Color(0x20E07B00)),
        _Zone(from: 26, to: 40, color: Color(0x20C0392B)),
      ];
    case 'srq20':
    default:
      return const [
        _Zone(from: 0,  to: 5,  color: Color(0x204A9E8F)),
        _Zone(from: 5,  to: 10, color: Color(0x202E6DA4)),
        _Zone(from: 10, to: 15, color: Color(0x20E07B00)),
        _Zone(from: 15, to: 20, color: Color(0x20C0392B)),
      ];
  }
}

// ── Screen ───────────────────────────────────────────────────────────────────

class AssessmentHistoryScreen extends StatelessWidget {
  const AssessmentHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: _tabs.length,
      child: Scaffold(
        backgroundColor: AppColors.surfaceCanvas,
        appBar: AppBar(
          backgroundColor: AppColors.surfaceCanvas,
          elevation: 0,
          title: Text('Riwayat Asesmen', style: AppTextStyles.h3),
          bottom: TabBar(
            isScrollable: false,
            labelStyle: AppTextStyles.bodyS.copyWith(
              fontWeight: FontWeight.w600,
            ),
            unselectedLabelStyle: AppTextStyles.bodyS,
            labelColor: AppColors.biru500,
            unselectedLabelColor: AppColors.fg3,
            indicatorColor: AppColors.biru500,
            indicatorSize: TabBarIndicatorSize.label,
            tabs: _tabs.map((t) => Tab(text: t.label)).toList(),
          ),
        ),
        body: TabBarView(
          children: _tabs
              .map((t) => _HistoryTabView(instrumentId: t.id))
              .toList(),
        ),
      ),
    );
  }
}

// ── Tab view ─────────────────────────────────────────────────────────────────

class _HistoryTabView extends ConsumerStatefulWidget {
  const _HistoryTabView({required this.instrumentId});

  final String instrumentId;

  @override
  ConsumerState<_HistoryTabView> createState() => _HistoryTabViewState();
}

class _HistoryTabViewState extends ConsumerState<_HistoryTabView>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  Future<void> _refresh() =>
      ref.refresh(assessmentHistoryProvider(widget.instrumentId).future);

  @override
  Widget build(BuildContext context) {
    super.build(context);

    final historyAsync =
        ref.watch(assessmentHistoryProvider(widget.instrumentId));
    final trendAsync =
        ref.watch(assessmentTrendProvider(widget.instrumentId));

    return RefreshIndicator(
      onRefresh: _refresh,
      color: AppColors.biru500,
      child: historyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => _buildEmpty(context, error: true),
        data: (history) => history.isEmpty
            ? _buildEmpty(context)
            : ListView(
                padding: const EdgeInsets.symmetric(
                  vertical: AppSpacing.md,
                  horizontal: AppSpacing.screenPadding,
                ),
                children: [
                  // Chart section
                  _ChartSection(
                    instrumentId: widget.instrumentId,
                    trendAsync: trendAsync,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text('Semua hasil', style: AppTextStyles.h3),
                  const SizedBox(height: AppSpacing.sm),
                  ...history.map(
                    (r) => _ResultTile(
                      result: r,
                      instrumentId: widget.instrumentId,
                    ),
                  ),
                  SizedBox(
                    height: MediaQuery.of(context).padding.bottom +
                        AppSpacing.xl,
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildEmpty(BuildContext context, {bool error = false}) {
    return ListView(
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.25),
        Center(
          child: Column(
            children: [
              Icon(
                error ? Icons.cloud_off_rounded : Icons.history_rounded,
                size: 48,
                color: AppColors.neutral300,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                error ? 'Gagal memuat riwayat.' : 'Belum ada hasil asesmen.',
                style:
                    AppTextStyles.bodyM.copyWith(color: AppColors.fg3),
              ),
              if (!error) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Selesaikan asesmen pertamamu\nuntuk melihat perkembangan di sini.',
                  style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
                  textAlign: TextAlign.center,
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ── Chart section ─────────────────────────────────────────────────────────────

class _ChartSection extends StatelessWidget {
  const _ChartSection({
    required this.instrumentId,
    required this.trendAsync,
  });

  final String instrumentId;
  final AsyncValue<List<TrendPoint>> trendAsync;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppRadius.card),
        boxShadow: [
          BoxShadow(
            color: AppColors.neutral900.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Tren Skor', style: AppTextStyles.h4),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            height: 160,
            child: trendAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator(strokeWidth: 2)),
              error: (_, __) => Center(
                child: Text(
                  'Data tidak tersedia',
                  style: AppTextStyles.bodyS.copyWith(color: AppColors.fg4),
                ),
              ),
              data: (points) => points.length < 2
                  ? Center(
                      child: Text(
                        'Butuh minimal 2 hasil untuk\nmenampilkan grafik tren.',
                        style: AppTextStyles.bodyS
                            .copyWith(color: AppColors.fg4),
                        textAlign: TextAlign.center,
                      ),
                    )
                  : _TrendChart(
                      instrumentId: instrumentId,
                      points: points,
                    ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          _ZoneLegend(instrumentId: instrumentId),
        ],
      ),
    );
  }
}

// ── Trend line chart ──────────────────────────────────────────────────────────

class _TrendChart extends StatelessWidget {
  const _TrendChart({required this.instrumentId, required this.points});

  final String instrumentId;
  final List<TrendPoint> points;

  @override
  Widget build(BuildContext context) {
    final maxY = AssessmentClinical.maxScoreFor(instrumentId).toDouble();
    final spots = points
        .asMap()
        .entries
        .map((e) => FlSpot(e.key.toDouble(), e.value.score.toDouble()))
        .toList();
    final zones = _zonesFor(instrumentId);

    return LineChart(
      LineChartData(
        minX: 0,
        maxX: (points.length - 1).toDouble(),
        minY: 0,
        maxY: maxY,
        rangeAnnotations: RangeAnnotations(
          horizontalRangeAnnotations: zones
              .map(
                (z) => HorizontalRangeAnnotation(
                  y1: z.from,
                  y2: z.to.clamp(0, maxY),
                  color: z.color,
                ),
              )
              .toList(),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            curveSmoothness: 0.3,
            color: AppColors.biru500,
            barWidth: 2.5,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, _, __, ___) => FlDotCirclePainter(
                radius: 4,
                color: AppColors.biru500,
                strokeWidth: 2,
                strokeColor: AppColors.surfaceRaised,
              ),
            ),
            belowBarData: BarAreaData(
              show: true,
              color: AppColors.biru500.withValues(alpha: 0.08),
            ),
          ),
        ],
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              interval: (maxY / 4).ceilToDouble(),
              getTitlesWidget: (value, _) => Text(
                value.toInt().toString(),
                style: AppTextStyles.meta.copyWith(color: AppColors.fg4),
              ),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 22,
              getTitlesWidget: (value, _) {
                final idx = value.toInt();
                if (idx < 0 || idx >= points.length) return const SizedBox();
                if (points.length <= 5 || idx % 2 == 0) {
                  return Text(
                    DateFormat('d/M').format(points[idx].date),
                    style:
                        AppTextStyles.meta.copyWith(color: AppColors.fg4),
                  );
                }
                return const SizedBox();
              },
            ),
          ),
          topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: (maxY / 4).ceilToDouble(),
          getDrawingHorizontalLine: (_) => const FlLine(
            color: Color(0x18000000),
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (spots) => spots
                .map((s) => LineTooltipItem(
                      '${s.y.toInt()}',
                      AppTextStyles.label
                          .copyWith(color: AppColors.fgOnPrimary),
                    ))
                .toList(),
          ),
        ),
      ),
    );
  }
}

// ── Zone legend ───────────────────────────────────────────────────────────────

class _ZoneLegend extends StatelessWidget {
  const _ZoneLegend({required this.instrumentId});

  final String instrumentId;

  static const _items = [
    (color: AppColors.sage500,      label: 'Minimal'),
    (color: AppColors.biru400,      label: 'Ringan'),
    (color: AppColors.matahari500,  label: 'Sedang'),
    (color: AppColors.danger500,    label: 'Berat'),
  ];

  @override
  Widget build(BuildContext context) {
    final count = instrumentId == 'pss10' ? 3 : 4;
    return Wrap(
      spacing: AppSpacing.md,
      runSpacing: 4,
      children: _items.take(count).map((item) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: item.color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              item.label,
              style: AppTextStyles.meta.copyWith(color: AppColors.fg3),
            ),
          ],
        );
      }).toList(),
    );
  }
}

// ── Result tile ───────────────────────────────────────────────────────────────

class _ResultTile extends StatelessWidget {
  const _ResultTile({required this.result, required this.instrumentId});

  final AssessmentResult result;
  final String instrumentId;

  Color _tierColor(int tier) => switch (tier) {
        0 => AppColors.sage500,
        1 => AppColors.biru400,
        2 => AppColors.matahari500,
        _ => AppColors.danger500,
      };

  @override
  Widget build(BuildContext context) {
    final tier = AssessmentClinical.tier(instrumentId, result.totalScore);
    final label = AssessmentClinical.labelIndonesian(
        instrumentId, result.totalScore);
    final tierColor = _tierColor(tier);
    final dateStr = DateFormat(
      'd MMM yyyy, HH:mm',
      'id_ID',
    ).format(result.completedAt.toLocal());

    return GestureDetector(
      onTap: () => context.push(
        '${AppRoutes.assessmentPastResult}?type=$instrumentId&id=${result.id}',
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: AppColors.surfaceRaised,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.borderSoft),
        ),
        child: Row(
          children: [
            // Score circle
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: tierColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                '${result.totalScore}',
                style: AppTextStyles.h3.copyWith(color: tierColor),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: tierColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.tag),
                    ),
                    child: Text(
                      label,
                      style: AppTextStyles.label.copyWith(color: tierColor),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    dateStr,
                    style:
                        AppTextStyles.bodyS.copyWith(color: AppColors.fg3),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: AppColors.neutral400,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
